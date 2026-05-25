export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/mongodb";
import { getActiveSurvey } from "@/lib/survey";

export async function GET() {
  await connectToDatabase();
  const survey = await getActiveSurvey();

  return NextResponse.json({ survey });
}