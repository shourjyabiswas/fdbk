"use client";

import { motion } from "framer-motion";
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
import { AUTHORIZED_TESTER_COUNT } from "@/lib/constants";
import Button from "@/components/ui/Button";

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
    _id?: string;
    title?: string;
    estimatedMinutes?: number;
    isExpired?: boolean;
    status?: string;
    hasPersonas?: boolean;
  } | null;
  aggregates: Aggregate[];
};

type SurveyOption = {
  _id: string;
  title: string;
  status: string;
  createdAt: string;
};

const piePalette = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const [selectedPersona, setSelectedPersona] = useState<string>("all");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/admin/surveys")
      .then((res) => res.json())
      .then((json) => {
        const items = (json.surveys ?? []) as SurveyOption[];
        setSurveys(items);
        if (items.length > 0) {
          setSelectedSurveyId(items[0]._id);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedSurveyId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      return;
    }

    const url = new URL("/api/analytics", window.location.origin);
    url.searchParams.set("surveyId", selectedSurveyId);
    if (selectedPersona && selectedPersona !== "all") {
      url.searchParams.set("persona", selectedPersona);
    }
    fetch(url)
      .then((res) => res.json())
      .then((json) => setData(json));
  }, [selectedSurveyId, selectedPersona]);

  useEffect(() => {
    if (data?.survey && data.survey.hasPersonas === false) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPersona("all");
    }
  }, [data]);

  const completionRate = useMemo(() => {
    if (!data) return 0;
    return ((data.totalResponses / AUTHORIZED_TESTER_COUNT) * 100).toFixed(1);
  }, [data]);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Survey Analytics</h1>
            <p className="text-[var(--muted-foreground)]">Pick a survey to review its performance.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
             <select
              value={selectedSurveyId}
              onChange={(event) => setSelectedSurveyId(event.target.value)}
              className="min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {surveys.length === 0 ? (
                <option value="">No surveys available</option>
              ) : (
                surveys.map((survey) => (
                  <option key={survey._id} value={survey._id}>
                    {survey.title || "Untitled Survey"}
                  </option>
                ))
              )}
            </select>
            {data?.survey?.hasPersonas !== false && (
              <select
                value={selectedPersona}
                onChange={(event) => setSelectedPersona(event.target.value)}
                className="min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
              >
                <option value="all">All Roles</option>
                <option value="student">Student</option>
                <option value="teacher">Professor</option>
                <option value="admin_hod">Admin / HOD</option>
              </select>
            )}
            <a
              href={
                selectedSurveyId
                  ? `/api/analytics/export?format=csv&surveyId=${selectedSurveyId}${selectedPersona !== 'all' ? `&persona=${selectedPersona}` : ''}`
                  : "/api/analytics/export?format=csv"
              }
            >
              <Button variant="secondary" disabled={!selectedSurveyId}>
                Export CSV
              </Button>
            </a>
          </div>
        </section>
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
            if (aggregate.type === "text") {
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
                    <a
                      href={
                        selectedSurveyId
                          ? `/api/analytics/export?format=text&surveyId=${selectedSurveyId}&questionId=${aggregate.questionId}${selectedPersona !== 'all' ? `&persona=${selectedPersona}` : ''}`
                          : "/api/analytics/export?format=text"
                      }
                    >
                      <Button variant="secondary" disabled={!selectedSurveyId}>
                        Download Text Responses
                      </Button>
                    </a>
                  </Card>
                </motion.div>
              );
            }

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

                  <div className="h-64 w-full min-h-64 min-w-0">
                    {isMounted && (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        {aggregate.type === "radio" || aggregate.type === "dropdown" ? (
                          <PieChart>
                            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90}>
                              {chartData.map((entry) => (
                                <Cell key={entry.name} fill={piePalette[chartData.indexOf(entry) % piePalette.length]} />
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
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </section>
      </main>
  );
}
