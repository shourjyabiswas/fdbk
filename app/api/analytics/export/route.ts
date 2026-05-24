import CryptoJS from "crypto-js";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import AnonymousResponse from "@/models/AnonymousResponse";
import Survey from "@/models/Survey";

function isAdminEmail(email?: string | null) {
  return !!email && !!process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const formatParam = url.searchParams.get("format") ?? "csv";
  const surveyId = url.searchParams.get("surveyId");
  const questionId = url.searchParams.get("questionId");

  if (formatParam === "text" || formatParam === "text-all") {
    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({ error: "Missing ENCRYPTION_KEY" }, { status: 500 });
    }
    if (process.env.ENCRYPTION_KEY.length !== 32) {
      return NextResponse.json({ error: "ENCRYPTION_KEY must be exactly 32 characters" }, { status: 500 });
    }

    if (formatParam === "text" && !questionId) {
      return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
    }

    await connectToDatabase();
    const survey = surveyId
      ? await Survey.findById(surveyId).lean()
      : await Survey.findOne({ status: "published" }).sort({ createdAt: -1 }).lean();

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (formatParam === "text") {
      const question = survey.questions.find((item) => String(item._id) === questionId);
      if (!question || question.type !== "text") {
        return NextResponse.json({ error: "Text question not found" }, { status: 404 });
      }
    }

    const personaParam = url.searchParams.get("persona");
    const queryFilter: Record<string, unknown> = { surveyId: survey._id };
    if (personaParam && personaParam !== "all") {
      queryFilter.persona = personaParam;
    }

    const responses = await AnonymousResponse.find(queryFilter).lean();
    const collected: string[] = [];
    const allTextQuestions = (personaParam && personaParam !== "all")
      ? survey.questions.filter((item) => item.type === "text" && (!item.persona || item.persona === "all" || item.persona === personaParam))
      : survey.questions.filter((item) => item.type === "text");
    const allTextResponses = new Map<string, string[]>();

    if (formatParam === "text-all") {
      for (const item of allTextQuestions) {
        allTextResponses.set(String(item._id), []);
      }
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
        if (answer.questionType !== "text") continue;
        if (typeof answer.value !== "string" || answer.value.trim() === "") continue;

        if (formatParam === "text") {
          if (String(answer.questionId) !== questionId) continue;
          collected.push(answer.value.trim());
          continue;
        }

        const bucket = allTextResponses.get(String(answer.questionId));
        if (bucket) {
          bucket.push(answer.value.trim());
        }
      }
    }

    let body = "";
    if (formatParam === "text") {
      body = `${collected.join("\n\n\n")}${collected.length ? "\n" : ""}`;
    } else {
      const sections = allTextQuestions.map((question, index) => {
        const questionResponses = allTextResponses.get(String(question._id)) ?? [];
        const heading = `${index + 1}. ${question.prompt || "Untitled question"}`;
        const responseBlock = questionResponses.length
          ? questionResponses.join("\n\n\n")
          : "No responses yet.";
        return `${heading}\n\n${responseBlock}`;
      });
      body = `${sections.join("\n\n\n\n")}${sections.length ? "\n" : ""}`;
    }

    const filename =
      formatParam === "text"
        ? `survey-text-responses-${format(new Date(), "yyyy-MM-dd")}.txt`
        : `survey-all-text-responses-${format(new Date(), "yyyy-MM-dd")}.txt`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  }

  const analyticsUrl = new URL(`${url.origin}/api/analytics`);
  if (surveyId) {
    analyticsUrl.searchParams.set("surveyId", surveyId);
  }
  const personaParam = url.searchParams.get("persona");
  if (personaParam) {
    analyticsUrl.searchParams.set("persona", personaParam);
  }

  const analyticsResponse = await fetch(analyticsUrl, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  if (!analyticsResponse.ok) {
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }

  const analyticsData = await analyticsResponse.json();

  if (formatParam === "summary") {
    return NextResponse.json({
      summary: analyticsData.aggregates.map((item: { prompt: string; responseCount: number }) => ({
        prompt: item.prompt,
        responseCount: item.responseCount,
      })),
    });
  }

  const rows = ["question prompt,option label,count,percentage"];

  for (const item of analyticsData.aggregates as Array<{ prompt: string; responseCount: number; data: Record<string, number> }>) {
    const total = Math.max(item.responseCount, 1);
    for (const [label, count] of Object.entries(item.data)) {
      const percentage = ((count / total) * 100).toFixed(2);
      rows.push(`"${item.prompt.replace(/"/g, '""')}","${label.replace(/"/g, '""')}",${count},${percentage}`);
    }
  }

  const csv = `${rows.join("\n")}\n`;
  const filename = `survey-analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}
