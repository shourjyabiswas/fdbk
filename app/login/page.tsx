"use client";

import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      redirect: false,
    });

    if (result?.ok) {
      router.push("/survey");
      return;
    }

    setError("Unable to sign in. Please verify your authorized email.");
    setIsSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md"
      >
        <Card className="space-y-6 bg-[var(--card)] text-[var(--card-foreground)]">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl [font-family:var(--font-heading)]">{process.env.NEXT_PUBLIC_APP_NAME ?? "FDBK"}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Authorized Access Only</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your.email@example.com"
              className="border-[var(--input)] bg-[var(--background)] text-[var(--foreground)]"
            />
            {error ? <p className="text-sm text-[var(--destructive)]">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </main>
  );
}
