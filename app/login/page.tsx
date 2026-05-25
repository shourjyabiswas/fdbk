export const dynamic = "force-dynamic";

import { connectToDatabase } from "@/lib/mongodb";
import { getActiveSurvey } from "@/lib/survey";
import LoginClient from "@/app/login/LoginClient";

export default async function LoginPage() {
  await connectToDatabase();
  const survey = await getActiveSurvey();

  const serializedSurvey = survey
    ? {
        title: survey.title,
        introduction: survey.introduction ?? undefined,
        description: survey.description ?? undefined,
        disclaimer: survey.disclaimer ?? undefined,
        createdAt: survey.createdAt ? new Date(survey.createdAt).toISOString() : undefined,
        expiresAt: survey.expiresAt ? new Date(survey.expiresAt).toISOString() : undefined,
        estimatedMinutes: survey.estimatedMinutes ?? undefined,
        instructions: survey.instructions ?? undefined,
        isExpired: survey.isExpired ?? false,
      }
    : null;

  return <LoginClient survey={serializedSurvey} />;
}
