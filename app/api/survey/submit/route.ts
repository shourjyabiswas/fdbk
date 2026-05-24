import crypto from "crypto";

import CryptoJS from "crypto-js";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getSurveyGroups, SURVEY_PERSONAS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/mongodb";
import { getPersonaAvailability } from "@/lib/persona-availability";
import AnonymousResponse from "@/models/AnonymousResponse";
import SubmissionRecord from "@/models/SubmissionRecord";
import User from "@/models/User";
import Survey from "@/models/Survey";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ENCRYPTION_KEY) {
    return NextResponse.json({ error: "Server encryption key is missing" }, { status: 500 });
  }

  if (process.env.ENCRYPTION_KEY.length !== 32) {
    return NextResponse.json({ error: "ENCRYPTION_KEY must be exactly 32 characters" }, { status: 500 });
  }

  const body = await request.json();
  const { surveyId, answers, group, persona } = body;

  if (!surveyId || !answers || !persona) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  await connectToDatabase();

  const survey = await Survey.findById(surveyId).lean();
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const hasPersonas = survey.hasPersonas !== false;

  if (hasPersonas) {
    const isValidPersona = SURVEY_PERSONAS.some((item) => item.key === persona);
    if (!isValidPersona) {
      return NextResponse.json({ error: "Invalid persona" }, { status: 400 });
    }
  } else {
    if (persona !== "all") {
      return NextResponse.json({ error: "Invalid persona for this survey" }, { status: 400 });
    }
  }

  const user = await User.findById(session.user.userId);
  if (!user || !user.isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const normalizedGroup = user.group?.trim();
  if (!normalizedGroup) {
    return NextResponse.json({ error: "No group assigned to this tester" }, { status: 403 });
  }

  if (!getSurveyGroups().includes(normalizedGroup)) {
    return NextResponse.json({ error: "Assigned group is not configured" }, { status: 500 });
  }

  if (group && String(group).trim() !== normalizedGroup) {
    return NextResponse.json({ error: "You can only submit for your assigned group" }, { status: 403 });
  }

  const existingRecord = await SubmissionRecord.findOne({ userId: user._id, surveyId });
  if (existingRecord) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  if (hasPersonas) {
    const personaAvailability = getPersonaAvailability(
      await AnonymousResponse.find({ surveyId, group: normalizedGroup }).select("persona").lean(),
      await User.countDocuments({ group: normalizedGroup, role: "tester", isAuthorized: true })
    );
    const availablePersonas = personaAvailability.available.map((item) => item.key);

    if (!availablePersonas.includes(persona)) {
      return NextResponse.json(
        {
          error: "That persona already has enough responses for your group. Please choose an available persona.",
        },
        { status: 409 }
      );
    }
  }

  let temporaryAnonymousToken: string | null = crypto.randomBytes(32).toString("hex");
  if (temporaryAnonymousToken.length !== 64) {
    return NextResponse.json({ error: "Failed to generate anonymous token" }, { status: 500 });
  }
  const transientChecksum = CryptoJS.SHA256(
    `${temporaryAnonymousToken}:${JSON.stringify(answers)}`
  ).toString(CryptoJS.enc.Hex);
  if (!transientChecksum) {
    return NextResponse.json({ error: "Failed to prepare anonymous payload" }, { status: 500 });
  }

  const encryptedAnswers = CryptoJS.AES.encrypt(JSON.stringify(answers), process.env.ENCRYPTION_KEY).toString();

  await AnonymousResponse.create({
    surveyId,
    group: normalizedGroup,
    persona,
    answers: encryptedAnswers,
  });

  await SubmissionRecord.create({
    userId: user._id,
    surveyId,
    submittedAt: new Date(),
  });

  user.hasSubmitted = true;
  await user.save();

  temporaryAnonymousToken = null;

  return NextResponse.json({
    success: true,
    message: "Response submitted successfully",
  });
}
