"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Card from "@/components/ui/Card";

type Aggregate = {
  questionId: string;
  type: string;
  prompt: string;
  responseCount: number;
  data: Record<string, number>;
};

type AnalyticsPayload = {
  totalResponses: number;
  survey: {
    estimatedMinutes?: number;
    isExpired?: boolean;
    status?: string;
  } | null;
  aggregates: Aggregate[];
};

const piePalette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  const completionRate = useMemo(() => {
    if (!data) return 0;
    return ((data.totalResponses / 34) * 100).toFixed(1);
  }, [data]);

  return (
    <div className="min-h-screen bg-[var(--background)] md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] p-4">
        <nav className="space-y-2">
          {[
            { href: "/dashboard", label: "Overview" },
            { href: "/dashboard", label: "Question Breakdown" },
            { href: "/api/analytics/export?format=csv", label: "Export" },
          ].map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={`block min-h-11 rounded-[var(--radius)] px-3 py-2 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] ${index === 0 ? "border-l-2 border-[var(--primary)]" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="space-y-6 p-4 md:p-6">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Responses", value: data?.totalResponses ?? 0 },
            { label: "Completion Rate", value: `${completionRate}%` },
            { label: "Average Time", value: `${data?.survey?.estimatedMinutes ?? "N/A"} min (estimated)` },
            {
              label: "Survey Status",
              value: data?.survey?.isExpired ? "expired" : data?.survey?.status ?? "unavailable",
            },
          ].map((item) => (
            <Card key={item.label} className="space-y-2">
              <p className="text-sm text-[var(--muted-foreground)]">{item.label}</p>
              <p className="text-xl font-semibold">{item.value}</p>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data?.aggregates?.map((aggregate) => {
            const chartData = Object.entries(aggregate.data).map(([name, value]) => ({ name, value }));
            return (
              <motion.div
                key={aggregate.questionId}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.2, once: true }}
                whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
              >
                <Card className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">{aggregate.prompt}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">{aggregate.responseCount} responses</p>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer>
                      {aggregate.type === "radio" || aggregate.type === "dropdown" ? (
                        <PieChart>
                          <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90}>
                            {chartData.map((entry, index) => (
                              <Cell key={entry.name} fill={piePalette[index % piePalette.length]} />
                            ))}
                          </Pie>
                          <Legend wrapperStyle={{ color: "var(--muted-foreground)" }} />
                          <Tooltip
                            contentStyle={{
                              background: "var(--popover)",
                              color: "var(--popover-foreground)",
                              border: "1px solid var(--border)",
                            }}
                          />
                        </PieChart>
                      ) : (
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                          <YAxis stroke="var(--muted-foreground)" />
                          <Tooltip
                            contentStyle={{
                              background: "var(--popover)",
                              color: "var(--popover-foreground)",
                              border: "1px solid var(--border)",
                            }}
                          />
                          <Legend wrapperStyle={{ color: "var(--muted-foreground)" }} />
                          <Bar dataKey="value" fill="var(--chart-1)" activeBar={{ fill: "var(--chart-2)" }} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
