"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";

import Card from "@/components/ui/Card";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/builder", label: "Survey Builder" },
  { href: "/dashboard", label: "Analytics" },
];

const quickActions = [
  {
    title: "Create a survey",
    description: "Build a new survey and publish it for testers.",
    href: "/admin/builder",
    cta: "Open Builder",
  },
  {
    title: "Published surveys",
    description: "Review published surveys and their status.",
    href: "/admin",
    cta: "View Surveys",
  },
  {
    title: "Analytics",
    description: "Check response trends and exports.",
    href: "/dashboard",
    cta: "View Analytics",
  },
  {
    title: "Test the survey",
    description: "Open the live survey view as a tester would see it.",
    href: "/survey",
    cta: "Open Survey",
  },
];

export default function AdminPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] md:grid md:grid-cols-[250px_1fr]">
      <button
        type="button"
        className="m-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius)] border border-[var(--sidebar-border)] bg-[var(--sidebar)] md:hidden"
        onClick={() => setOpen((value) => !value)}
      >
        <Menu />
      </button>
      <aside
        className={`${open ? "block" : "hidden"} border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] p-4 md:block`}
      >
        <nav className="space-y-2">
          {links.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="block min-h-11 rounded-[var(--radius)] px-3 py-2 text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-[var(--muted-foreground)]">
            Create, publish, and monitor surveys without typing URLs.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <Card key={action.title} className="flex h-full flex-col justify-between">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{action.title}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">{action.description}</p>
              </div>
              <Link
                href={action.href}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--radius)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
              >
                {action.cta}
              </Link>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
