import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { surveySchema } from "@/lib/schemas";
import Survey from "@/models/Survey";

function hasValidQuestionTypeDistribution(questions: { type: string }[]) {
  const counts = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.type] = (acc[question.type] ?? 0) + 1;
    return acc;
  }, {});

  const usedTypeCounts = Object.values(counts).filter((count) => count > 0);
  return usedTypeCounts.every((count) => count >= 3 && count <= 5);
}

function isAdminEmail(email?: string | null) {
  return !!email && !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const surveys = await Survey.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ surveys });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = surveySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid survey payload", details: parsed.error.flatten() }, { status: 400 });
  }

  if (!hasValidQuestionTypeDistribution(parsed.data.questions)) {
    return NextResponse.json(
      { error: "Each question type used must have between 3 and 5 questions of that type." },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const survey = await Survey.create({
    ...parsed.data,
    status: "published",
    createdAt: new Date(),
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
  });

  return NextResponse.json({ survey }, { status: 201 });
}
