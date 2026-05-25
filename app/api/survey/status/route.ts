export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { getSurveyGroups, SURVEY_PERSONAS } from "@/lib/constants";
import { connectToDatabase } from "@/lib/mongodb";
import { getPersonaAvailability } from "@/lib/persona-availability";
import { getActiveSurvey } from "@/lib/survey";
import AnonymousResponse from "@/models/AnonymousResponse";
import SubmissionRecord from "@/models/SubmissionRecord";
import User from "@/models/User";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const url = new URL(request.url);
  const requestedGroup = url.searchParams.get("group")?.trim();
  const groupOptions = getSurveyGroups();
  const user = await User.findById(session.user.userId).select("group isAuthorized").lean();
  if (!user || !user.isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const assignedGroup = user.group?.trim();
  if (!assignedGroup) {
    return NextResponse.json({ error: "No group assigned to this tester" }, { status: 403 });
  }

  if (!groupOptions.includes(assignedGroup)) {
    return NextResponse.json({ error: "Assigned group is not configured" }, { status: 500 });
  }

  if (requestedGroup && requestedGroup !== assignedGroup) {
    return NextResponse.json({ error: "You can only view your assigned group" }, { status: 403 });
  }

  const selectedGroup = assignedGroup;
  const survey = await getActiveSurvey();

  if (!survey) {
    return NextResponse.json({
      hasSubmitted: false,
      survey: null,
      assignedGroup,
      groupOptions,
      personaOptions: SURVEY_PERSONAS,
    });
  }

  const record = await SubmissionRecord.findOne({
    userId: session.user.userId,
    surveyId: survey._id,
  }).lean();

  const personaAvailability = getPersonaAvailability(
    await AnonymousResponse.find({ surveyId: survey._id, group: selectedGroup }).select("persona").lean(),
    await User.countDocuments({ group: selectedGroup, role: "tester", isAuthorized: true })
  );

  return NextResponse.json({
    hasSubmitted: Boolean(record),
    surveyId: survey._id,
    survey,
    assignedGroup,
    groupOptions,
    personaOptions: SURVEY_PERSONAS,
    personaAvailability,
  });
}
