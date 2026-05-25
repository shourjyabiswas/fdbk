"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { useSearchParams } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import SurveyPreview from "@/components/SurveyPreview";
import { SurveyInput, surveySchema } from "@/lib/schemas";

const DEFAULT_TEXT_CHARACTER_LIMIT = 200;

const generateObjectIdString = () => {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const random = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return timestamp + random;
};

const emptyQuestion = (type: SurveyInput["questions"][number]["type"]): SurveyInput["questions"][number] => ({
  _id: generateObjectIdString(),
  type,
  prompt: "",
  placeholder: type === "rating" ? undefined : "",
  isRequired: true,
  characterLimit: type === "text" ? DEFAULT_TEXT_CHARACTER_LIMIT : undefined,
  minCharacterLimit: undefined,
  shuffleOptions: false,
  options: type === "text" || type === "rating" ? [] : ["Option 1", "Option 2"],
  persona: "all",
});

const questionTypeOptions = [
  { label: "Text Input", value: "text" },
  { label: "Radio Buttons", value: "radio" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Dropdown", value: "dropdown" },
  { label: "Rating", value: "rating" },
] as const;

const formSchema = surveySchema.extend({
  expiresAt: z.string().optional(),
});

type FormValues = z.input<typeof formSchema>;

const inputClassName =
  "w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]";

function SurveyBuilderContent() {
  const searchParams = useSearchParams();
  const surveyId = searchParams.get("id");

  const [questionTypeToAdd, setQuestionTypeToAdd] = useState<FormValues["questions"][number]["type"]>("text");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      introduction: "",
      description: "",
      disclaimer: "",
      expiresAt: "",
      estimatedMinutes: 10,
      instructions: "",
      questions: [],
      hasPersonas: true,
    },
  });

  const title = useWatch({ control: form.control, name: "title" }) ?? "";
  const introduction = useWatch({ control: form.control, name: "introduction" }) ?? "";
  const description = useWatch({ control: form.control, name: "description" }) ?? "";
  const disclaimer = useWatch({ control: form.control, name: "disclaimer" }) ?? "";
  const estimatedMinutes = useWatch({ control: form.control, name: "estimatedMinutes" }) ?? 10;
  const instructions = useWatch({ control: form.control, name: "instructions" }) ?? "";
  const hasPersonas = useWatch({ control: form.control, name: "hasPersonas" }) ?? true;
  const watchedQuestions = useWatch({ control: form.control, name: "questions" });
  const questions = useMemo(() => watchedQuestions ?? [], [watchedQuestions]);

  // Load existing survey details in Edit Mode
  useEffect(() => {
    if (surveyId) {
      fetch(`/api/admin/surveys/${surveyId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.survey) {
            const survey = data.survey;
            form.reset({
              title: survey.title ?? "",
              introduction: survey.introduction ?? "",
              description: survey.description ?? "",
              disclaimer: survey.disclaimer ?? "",
              expiresAt: survey.expiresAt ? new Date(survey.expiresAt).toISOString().split("T")[0] : "",
              estimatedMinutes: survey.estimatedMinutes ?? 10,
              instructions: survey.instructions ?? "",
              questions: survey.questions ?? [],
              hasPersonas: survey.hasPersonas !== false,
            });
          }
        });
    }
  }, [surveyId, form]);

  const typeCounts = useMemo(() => {
    return questions.reduce<Record<string, number>>((acc, question) => {
      acc[question.type] = (acc[question.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [questions]);

  const onAddQuestion = () => {
    form.setValue("questions", [emptyQuestion(questionTypeToAdd), ...questions]);
  };

  const onDragStart = (index: number) => setDragIndex(index);

  const onDrop = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) return;
    const next = [...questions];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dropIndex, 0, moved);
    form.setValue("questions", next);
    setDragIndex(null);
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError("");
    const url = surveyId ? `/api/admin/surveys/${surveyId}` : "/api/admin/surveys";
    const method = surveyId ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        questions: values.questions,
        status: "published",
        estimatedMinutes: Number(values.estimatedMinutes),
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setSubmitError(data.error ?? "Failed to publish survey");
      return;
    }

    if (surveyId) {
      alert("Survey updated successfully!");
    } else {
      form.reset({ ...form.getValues(), questions: [] });
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{surveyId ? "Edit Survey" : "Survey Builder"}</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="space-y-4">
          <div>
            <label className="mb-1 block text-sm">Title</label>
            <input {...form.register("title")} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Introduction</label>
            <textarea {...form.register("introduction")} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Description</label>
            <textarea {...form.register("description")} className={inputClassName} />
          </div>
          <div>
            <label className="mb-1 block text-sm">Disclaimer</label>
            <textarea {...form.register("disclaimer")} className={inputClassName} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Expires At</label>
              <input type="date" {...form.register("expiresAt")} className={inputClassName} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Estimated Minutes</label>
              <input
                type="number"
                min={1}
                {...form.register("estimatedMinutes", { valueAsNumber: true })}
                className={inputClassName}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Instructions</label>
            <textarea {...form.register("instructions")} className={inputClassName} />
          </div>
          <div className="pt-2">
            <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2 bg-[var(--background)] cursor-pointer hover:bg-[var(--accent)] transition-colors">
              <Controller
                control={form.control}
                name="hasPersonas"
                render={({ field }) => (
                  <input
                    type="checkbox"
                    checked={!!field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                  />
                )}
              />
              <span className="text-sm font-medium text-[var(--foreground)]">Use Target Roles / Personas (Multi-role Questionnaire)</span>
            </label>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={questionTypeToAdd}
              onChange={(event) =>
                setQuestionTypeToAdd(event.target.value as FormValues["questions"][number]["type"])
              }
              className={`${inputClassName} max-w-xs`}
            >
              {questionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="button" onClick={onAddQuestion} className="gap-2">
              <Plus className="h-4 w-4" /> Add Question
            </Button>
          </div>

          <div className="space-y-3">
            {questions.map((question, index) => (
              <motion.div
                key={question._id ?? index}
                whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
                draggable
                onDragStart={() => onDragStart(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDrop(index)}
              >
                <Card className="space-y-3 border bg-[var(--card)] text-[var(--card-foreground)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <GripVertical className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">{question.type}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => form.setValue("questions", questions.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    value={question.prompt}
                    onChange={(event) => form.setValue(`questions.${index}.prompt`, event.target.value)}
                    placeholder="Question prompt"
                    className={inputClassName}
                  />
                  {question.type === "text" && (
                    <input
                      value={question.placeholder ?? ""}
                      onChange={(event) => form.setValue(`questions.${index}.placeholder`, event.target.value)}
                      placeholder="Placeholder text"
                      className={inputClassName}
                    />
                  )}
                  <div className={`grid gap-4 ${
                    question.type === "text"
                      ? (hasPersonas ? "md:grid-cols-4" : "md:grid-cols-3")
                      : (hasPersonas ? "md:grid-cols-2" : "md:grid-cols-1")
                  }`}>
                    <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2">
                      <input
                        type="checkbox"
                        checked={question.isRequired}
                        onChange={(event) => form.setValue(`questions.${index}.isRequired`, event.target.checked)}
                      />
                      Required
                    </label>

                    {hasPersonas ? (
                      <div className="flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2">
                        <span className="text-sm font-medium text-[var(--muted-foreground)] whitespace-nowrap">Target Role:</span>
                        <select
                          value={question.persona ?? "all"}
                          onChange={(event) => form.setValue(`questions.${index}.persona`, event.target.value as "all" | "student" | "teacher" | "admin_hod")}
                          className="w-full bg-transparent text-sm focus:outline-none text-[var(--foreground)]"
                        >
                          <option value="all" className="bg-[var(--card)]">All Roles</option>
                          <option value="student" className="bg-[var(--card)]">Student</option>
                          <option value="teacher" className="bg-[var(--card)]">Professor</option>
                          <option value="admin_hod" className="bg-[var(--card)]">Admin / HOD</option>
                        </select>
                      </div>
                    ) : null}

                    {question.type === "text" && (
                      <>
                        <input
                          type="number"
                          min={0}
                          value={question.minCharacterLimit ?? ""}
                          onChange={(event) =>
                            form.setValue(
                              `questions.${index}.minCharacterLimit`,
                              event.target.value === "" ? undefined : Math.max(0, Number(event.target.value))
                            )
                          }
                          placeholder="Min char limit"
                          className={inputClassName}
                        />
                        <input
                          type="number"
                          min={0}
                          value={question.characterLimit ?? ""}
                          onChange={(event) =>
                            form.setValue(
                              `questions.${index}.characterLimit`,
                              event.target.value === "" ? undefined : Math.max(0, Number(event.target.value))
                            )
                          }
                          placeholder="Max char limit"
                          className={inputClassName}
                        />
                      </>
                    )}
                  </div>
                  {question.type === "radio" || question.type === "checkbox" || question.type === "dropdown" ? (
                    <div className="space-y-2">
                      {(question.options ?? []).map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <input
                            className={inputClassName}
                            value={option}
                            onFocus={(event) => event.target.select()}
                            onChange={(event) =>
                              form.setValue(
                                `questions.${index}.options`,
                                (question.options ?? []).map((item, itemIndex) =>
                                  itemIndex === optionIndex ? event.target.value : item
                                )
                              )
                            }
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              form.setValue(
                                `questions.${index}.options`,
                                (question.options ?? []).filter((_, itemIndex) => itemIndex !== optionIndex)
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          form.setValue(`questions.${index}.options`, [
                            ...(question.options ?? []),
                            `Option ${(question.options ?? []).length + 1}`,
                          ])
                        }
                      >
                        Add Option
                      </Button>
                      <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2">
                        <input
                          type="checkbox"
                          checked={question.shuffleOptions}
                          onChange={(event) =>
                            form.setValue(`questions.${index}.shuffleOptions`, event.target.checked)
                          }
                        />
                        Shuffle options
                      </label>
                    </div>
                  ) : null}
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] p-3 text-sm">
            <p className="font-medium">Question type counts:</p>
            <ul className="mt-1 space-y-1 text-[var(--muted-foreground)]">
              {questionTypeOptions.map((item) => {
                const count = typeCounts[item.value] ?? 0;
                return (
                  <li key={item.value}>
                    {item.label}: {count}
                  </li>
                );
              })}
            </ul>
          </div>

          {submitError ? <p className="text-sm text-[var(--destructive)]">{submitError}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPreviewOpen(true)}
              disabled={questions.length === 0}
            >
              Preview Survey
            </Button>
            <Button type="submit" disabled={questions.length === 0}>
              {surveyId ? "Save Changes" : "Publish Survey"}
            </Button>
          </div>
        </Card>
      </form>
      <SurveyPreview
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        surveyData={{
          title,
          introduction,
          description,
          disclaimer,
          estimatedMinutes: Number(estimatedMinutes) || undefined,
          instructions,
          questions,
        }}
      />
    </main>
  );
}

export default function SurveyBuilderPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl p-4 md:p-6">Loading builder...</main>}>
      <SurveyBuilderContent />
    </Suspense>
  );
}
