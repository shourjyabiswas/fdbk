import crypto from "crypto";

import CryptoJS from "crypto-js";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import AnonymousResponse from "@/models/AnonymousResponse";
import SubmissionRecord from "@/models/SubmissionRecord";
import User from "@/models/User";

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
  const { surveyId, answers } = body;

  if (!surveyId || !answers) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  await connectToDatabase();

  const user = await User.findById(session.user.userId);
  if (!user || !user.isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const existingRecord = await SubmissionRecord.findOne({ userId: user._id, surveyId });
  if (existingRecord) {
    return NextResponse.json({ error: "Already submitted" }, { status: 409 });
  }

  let temporaryAnonymousToken: string | null = crypto.randomBytes(32).toString("hex");

  const encryptedAnswers = CryptoJS.AES.encrypt(
    JSON.stringify({ token: temporaryAnonymousToken, answers }),
    process.env.ENCRYPTION_KEY
  ).toString();

  await AnonymousResponse.create({
    surveyId,
    submittedAt: new Date(),
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
