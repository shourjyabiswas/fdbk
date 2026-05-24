import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { surveySchema } from "@/lib/schemas";
import Survey from "@/models/Survey";

function isAdminEmail(email?: string | null) {
  return !!email && !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

function hasValidQuestionTypeDistribution(questions: { type: string }[]) {
  const counts = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.type] = (acc[question.type] ?? 0) + 1;
    return acc;
  }, {});

  const usedTypeCounts = Object.values(counts).filter((count) => count > 0);
  return usedTypeCounts.every((count) => count >= 3 && count <= 5);
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { id } = await params;
  const survey = await Survey.findById(id).lean();
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  return NextResponse.json({ survey });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const { id } = await params;

  const updateData = {
    ...parsed.data,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
  };

  const survey = await Survey.findByIdAndUpdate(id, updateData, { new: true }).lean();

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  return NextResponse.json({ survey });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const nextStatus = body.status;
  const nextActive = body.isActive;

  if (nextStatus !== undefined && nextStatus !== "draft" && nextStatus !== "published" && nextStatus !== "archived") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (nextActive !== undefined && typeof nextActive !== "boolean") {
    return NextResponse.json({ error: "Invalid isActive flag" }, { status: 400 });
  }

  await connectToDatabase();
  const { id } = await params;

  if (nextActive === true) {
    await Survey.updateMany({ isActive: true }, { isActive: false });
  }

  const update: Record<string, unknown> = {};
  if (nextStatus !== undefined) {
    update.status = nextStatus;
    if (nextStatus === "archived") {
      update.isActive = false;
    }
  }
  if (nextActive !== undefined) {
    update.isActive = nextActive;
  }

  const survey = await Survey.findByIdAndUpdate(id, update, { new: true }).lean();

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  return NextResponse.json({ survey });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { id } = await params;
  const survey = await Survey.findByIdAndDelete(id).lean();
  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Survey deleted successfully" });
}
