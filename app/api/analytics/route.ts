import CryptoJS from "crypto-js";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import AnonymousResponse from "@/models/AnonymousResponse";
import Survey from "@/models/Survey";

const stopwords = new Set(["the", "and", "for", "that", "this", "with", "from", "your", "have", "been"]);

type AggregatedItem = {
  questionId: string;
  type: string;
  prompt: string;
  responseCount: number;
  data: Record<string, number>;
};

function isAdminEmail(email?: string | null) {
  return !!email && !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ENCRYPTION_KEY) {
    return NextResponse.json({ error: "Missing ENCRYPTION_KEY" }, { status: 500 });
  }
  if (process.env.ENCRYPTION_KEY.length !== 32) {
    return NextResponse.json({ error: "ENCRYPTION_KEY must be exactly 32 characters" }, { status: 500 });
  }

  await connectToDatabase();
  const url = new URL(request.url);
  const surveyId = url.searchParams.get("surveyId");
  const persona = url.searchParams.get("persona");

  const survey = surveyId
    ? await Survey.findById(surveyId).lean()
    : await Survey.findOne({ status: "published" }).sort({ createdAt: -1 }).lean();

  if (!survey) {
    return NextResponse.json({ survey: null, aggregates: [] });
  }

  const queryFilter: Record<string, unknown> = { surveyId: survey._id };
  const hasPersonas = survey.hasPersonas !== false;
  if (hasPersonas && persona && persona !== "all") {
    queryFilter.persona = persona;
  }

  const responses = await AnonymousResponse.find(queryFilter).lean();

  const aggregateMap = new Map<string, AggregatedItem>();

  const surveyQuestions = (hasPersonas && persona && persona !== "all")
    ? survey.questions.filter((q) => !q.persona || q.persona === "all" || q.persona === persona)
    : survey.questions;

  for (const question of surveyQuestions) {
    aggregateMap.set(String(question._id), {
      questionId: String(question._id),
      type: question.type,
      prompt: question.prompt,
      responseCount: 0,
      data: {},
    });
  }

  for (const response of responses) {
    const decrypted = CryptoJS.AES.decrypt(String(response.answers), process.env.ENCRYPTION_KEY).toString(
      CryptoJS.enc.Utf8
    );
    if (!decrypted) continue;

    let normalizedAnswers: Array<{ questionId: string; questionType: string; value: string | string[] | number }> =
      [];
    try {
      const parsed = JSON.parse(decrypted) as
        | Array<{ questionId: string; questionType: string; value: string | string[] | number }>
        | { answers: Array<{ questionId: string; questionType: string; value: string | string[] | number }> };
      normalizedAnswers = Array.isArray(parsed) ? parsed : parsed.answers;
    } catch {
      continue;
    }

    for (const answer of normalizedAnswers) {
      const aggregate = aggregateMap.get(String(answer.questionId));
      if (!aggregate) continue;
      aggregate.responseCount += 1;

      if (answer.questionType === "checkbox" && Array.isArray(answer.value)) {
        for (const option of answer.value) {
          aggregate.data[option] = (aggregate.data[option] ?? 0) + 1;
        }
      } else if (answer.questionType === "text" && typeof answer.value === "string") {
        const words = answer.value
          .toLowerCase()
          .split(/\s+/)
          .map((word) => word.replace(/[^a-z]/g, ""))
          .filter((word) => word && !stopwords.has(word));
        for (const word of words) {
          aggregate.data[word] = (aggregate.data[word] ?? 0) + 1;
        }
      } else {
        const key = String(answer.value);
        aggregate.data[key] = (aggregate.data[key] ?? 0) + 1;
      }
    }
  }

  const aggregates = Array.from(aggregateMap.values()).map((item) => {
    if (item.type === "rating") {
      for (const score of ["1", "2", "3", "4", "5"]) {
        item.data[score] = item.data[score] ?? 0;
      }
    }
    if (item.type === "text") {
      item.data = Object.fromEntries(
        Object.entries(item.data)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
      );
    }
    return item;
  });

  return NextResponse.json({ survey, totalResponses: responses.length, aggregates });
}
