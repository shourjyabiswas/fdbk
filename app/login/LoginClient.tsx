"use client";

import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import LinkifyText from "@/components/LinkifyText";

type SurveyPayload = {
  title: string;
  introduction?: string;
  description?: string;
  disclaimer?: string;
  createdAt?: string;
  expiresAt?: string;
  estimatedMinutes?: number;
  instructions?: string;
  isExpired?: boolean;
} | null;

export default function LoginClient({ survey }: { survey: SurveyPayload }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"email" | "password">("email");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (step === "email") {
      const response = await fetch(`/api/auth/admin-check?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.isAdmin) {
        setStep("password");
        setIsSubmitting(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        redirect: false,
      });

      if (result?.ok) {
        router.push("/survey?start=1");
        return;
      }

      setError("Unable to sign in. Please verify your authorized email.");
      setIsSubmitting(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push("/admin");
      return;
    }

    setError("Unable to sign in. Please verify your admin credentials.");
    setIsSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-3xl"
      >
        <Card className="space-y-6 bg-[var(--card)] text-[var(--card-foreground)]">
          <div className="space-y-3">
            <h1 className="text-3xl [font-family:var(--font-heading)]">
              {survey?.title ?? process.env.NEXT_PUBLIC_APP_NAME ?? "FDBK"}
            </h1>
            {survey?.introduction ? (
              <div className="border-l-2 border-[var(--secondary)] pl-4 text-sm text-[var(--muted-foreground)] whitespace-pre-line break-words">
                <LinkifyText text={survey.introduction} />
              </div>
            ) : null}
            {survey?.description ? (
              <div className="space-y-2">
                  <p className="text-base font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                    Instructions
                </p>
                <p className="pl-2 text-[var(--foreground)] whitespace-pre-line break-words">
                  <LinkifyText text={survey.description} />
                </p>
              </div>
            ) : null}
            {survey?.disclaimer ? (
              <div className="space-y-2">
                <p className="text-base font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  Disclaimer
                </p>
                <p className="pl-2 text-[var(--foreground)] whitespace-pre-line break-words">
                  <LinkifyText text={survey.disclaimer} />
                </p>
              </div>
            ) : null}
              {/*
              <div className="grid gap-2 text-sm text-[var(--muted-foreground)]">
                {survey?.createdAt ? <p>Created: {format(new Date(survey.createdAt), "PPP")}</p> : null}
                {survey?.expiresAt ? <p>Expires: {format(new Date(survey.expiresAt), "PPP")}</p> : null}
                <p>Estimated: {survey?.estimatedMinutes ?? "N/A"} minutes</p>
                {survey?.instructions ? (
                  <p className="whitespace-pre-line break-words">
                    <LinkifyText text={survey.instructions} />
                  </p>
                ) : null}
              </div>
              */}
          </div>

          {survey?.isExpired ? (
            <p className="text-sm text-[var(--destructive)]">This survey has expired.</p>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (step === "password") {
                  setStep("email");
                  setPassword("");
                }
              }}
              placeholder="your.email@example.com"
              className="border-[var(--input)] bg-[var(--background)] text-[var(--foreground)]"
              disabled={step === "password"}
            />
            {step === "password" && (
              <Input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="border-[var(--input)] bg-[var(--background)] text-[var(--foreground)]"
              />
            )}
            {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || (step === "email" && survey?.isExpired)}
            >
              {isSubmitting ? "Signing in..." : step === "password" ? "Sign In" : "Begin Survey"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}
