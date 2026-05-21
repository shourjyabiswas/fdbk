"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { SurveyInput, surveySchema } from "@/lib/schemas";

const emptyQuestion = (type: SurveyInput["questions"][number]["type"]): SurveyInput["questions"][number] => ({
  type,
  prompt: "",
  placeholder: "",
  isRequired: true,
  characterLimit: type === "text" ? 200 : undefined,
  shuffleOptions: false,
  options: type === "text" || type === "rating" ? [] : ["Option 1", "Option 2"],
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

export default function SurveyBuilderPage() {
  const [questionTypeToAdd, setQuestionTypeToAdd] = useState<FormValues["questions"][number]["type"]>("text");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState("");

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
    },
  });

  const watchedQuestions = useWatch({ control: form.control, name: "questions" });
  const questions = useMemo(() => watchedQuestions ?? [], [watchedQuestions]);

  const typeCounts = useMemo(() => {
    return questions.reduce<Record<string, number>>((acc, question) => {
      acc[question.type] = (acc[question.type] ?? 0) + 1;
      return acc;
    }, {});
  }, [questions]);

  const hasTypeConstraintError = Object.values(typeCounts).some((count) => count < 3 || count > 5);

  const onAddQuestion = () => {
    form.setValue("questions", [...questions, emptyQuestion(questionTypeToAdd)]);
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
    const response = await fetch("/api/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        status: "published",
        estimatedMinutes: Number(values.estimatedMinutes),
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setSubmitError(data.error ?? "Failed to publish survey");
      return;
    }

    form.reset({ ...form.getValues(), questions: [] });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Survey Builder</h1>
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
                key={`${question.type}-${index}`}
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
                  <input
                    value={question.placeholder ?? ""}
                    onChange={(event) => form.setValue(`questions.${index}.placeholder`, event.target.value)}
                    placeholder="Placeholder text"
                    className={inputClassName}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex min-h-11 items-center gap-2 rounded-[var(--radius)] border border-[var(--border)] px-3 py-2">
                      <input
                        type="checkbox"
                        checked={question.isRequired}
                        onChange={(event) => form.setValue(`questions.${index}.isRequired`, event.target.checked)}
                      />
                      Required
                    </label>
                    <input
                      type="number"
                      value={question.characterLimit ?? ""}
                      onChange={(event) =>
                        form.setValue(`questions.${index}.characterLimit`, Number(event.target.value) || undefined)
                      }
                      placeholder="Character limit"
                      className={inputClassName}
                    />
                  </div>
                  {question.type === "radio" || question.type === "checkbox" || question.type === "dropdown" ? (
                    <div className="space-y-2">
                      {(question.options ?? []).map((option, optionIndex) => (
                        <div key={`${option}-${optionIndex}`} className="flex items-center gap-2">
                          <input
                            className={inputClassName}
                            value={option}
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
                const invalid = count > 0 && (count < 3 || count > 5);
                return (
                  <li key={item.value} className={invalid ? "text-[var(--destructive)]" : ""}>
                    {item.label}: {count}
                  </li>
                );
              })}
            </ul>
            {hasTypeConstraintError ? (
              <p className="mt-2 text-[var(--destructive)]">
                Each question type used must have between 3 and 5 questions of that type.
              </p>
            ) : null}
          </div>

          {submitError ? <p className="text-sm text-[var(--destructive)]">{submitError}</p> : null}
          <Button type="submit" disabled={questions.length === 0 || hasTypeConstraintError}>
            Publish Survey
          </Button>
        </Card>
      </form>
    </div>
  );
}
