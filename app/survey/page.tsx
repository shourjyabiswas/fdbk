"use client";

import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { Star, Info, X } from "lucide-react";
import { Suspense, useEffect, useMemo, useReducer, useState } from "react";
import { useSearchParams } from "next/navigation";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LinkifyText from "@/components/LinkifyText";

type Question = {
  _id: string;
  type: "text" | "radio" | "checkbox" | "dropdown" | "rating";
  prompt: string;
  placeholder?: string;
  isRequired: boolean;
  characterLimit?: number;
  minCharacterLimit?: number;
  shuffleOptions?: boolean;
  options?: string[];
  persona?: string;
};

type SurveyStatus = {
  error?: string;
  hasSubmitted?: boolean;
  surveyId?: string;
  assignedGroup?: string;
  groupOptions?: string[];
  personaOptions?: Array<{ key: string; label: string }>;
  personaAvailability?: {
    counts: Record<string, number>;
    available: Array<{ key: string; label: string }>;
    groupMemberCount?: number;
  } | null;
  survey?: {
    _id: string;
    title: string;
    introduction?: string;
    description?: string;
    disclaimer?: string;
    createdAt: string;
    expiresAt?: string;
    estimatedMinutes?: number;
    instructions?: string;
    isExpired?: boolean;
    hasPersonas?: boolean;
    questions: Question[];
  } | null;
};

type State = {
  step: number;
  answers: Record<string, string | string[] | number>;
  suggestions: string;
};

type Action =
  | { type: "SET_STEP"; payload: number }
  | { type: "SET_ANSWER"; questionId: string; value: string | string[] | number }
  | { type: "SET_SUGGESTIONS"; payload: string };

const initialState: State = {
  step: 0,
  answers: {},
  suggestions: "",
};

function reducer(state: State, action: Action): State {
  if (action.type === "SET_STEP") {
    return { ...state, step: action.payload };
  }
  if (action.type === "SET_ANSWER") {
    return {
      ...state,
      answers: {
        ...state.answers,
        [action.questionId]: action.value,
      },
    };
  }
  if (action.type === "SET_SUGGESTIONS") {
    return { ...state, suggestions: action.payload };
  }
  return state;
}

const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const heroLine = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

function SurveyContent() {
  const [status, setStatus] = useState<SurveyStatus | null>(null);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("");
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    fetch("/api/survey/status")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const shouldSkipIntro = searchParams.get("start") === "1";
    if (shouldSkipIntro && status?.survey && !status.hasSubmitted && status.assignedGroup && selectedPersona) {
      dispatch({ type: "SET_STEP", payload: 1 });
    }
  }, [searchParams, selectedPersona, status]);

  useEffect(() => {
    if (status?.survey) {
      const hasPersonas = status.survey.hasPersonas !== false;
      if (!hasPersonas) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedPersona("all");
      } else if (status.personaAvailability) {
        const memberCount = status.personaAvailability.groupMemberCount ?? 0;
        if (memberCount === 1) {
          const available = status.personaAvailability.available ?? [];
          const defaultPersona = available[0]?.key || "all";
          setSelectedPersona(defaultPersona);
        }
      }
    }
  }, [status]);

  const questions = useMemo(() => {
    const allQuestions = status?.survey?.questions ?? [];
    if (status?.survey?.hasPersonas === false || !selectedPersona) return allQuestions;
    return allQuestions.filter(
      (question) => !question.persona || question.persona === "all" || question.persona === selectedPersona
    );
  }, [status?.survey, selectedPersona]);
  const totalSteps = questions.length + 2;
  const currentQuestion = state.step > 0 && state.step <= questions.length ? questions[state.step - 1] : null;
  const availablePersonas = status?.personaAvailability?.available ?? [];
  const personaCounts = status?.personaAvailability?.counts ?? {};
  const isSetupComplete = Boolean(status?.assignedGroup && selectedPersona);
  const shouldSkipIntro = searchParams.get("start") === "1";

  const progress = useMemo(() => {
    if (totalSteps <= 1) return 0;
    return (state.step / (totalSteps - 1)) * 100;
  }, [state.step, totalSteps]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  }

  if (status?.hasSubmitted) {
    return (
      <main className="flex min-h-screen flex-col items-center p-4 py-8 md:p-6">
        <Card className="max-w-lg space-y-4 text-center">
          <motion.svg viewBox="0 0 52 52" className="mx-auto h-24 w-24" fill="none" stroke="var(--primary)">
            <motion.circle
              cx="26"
              cy="26"
              r="24"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            <motion.path
              d="M14 27l8 8 16-16"
              strokeWidth="3"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.6 }}
            />
          </motion.svg>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Your response has been recorded</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Thank you for reviewing Centralized Attendance Portal
          </p>
          <p className="text-[var(--muted-foreground)]">This survey only allows one submission per participant</p>
        </Card>
      </main>
    );
  }

  if (status?.error) {
    return <main className="flex min-h-screen items-center justify-center p-6">{status.error}</main>;
  }

  if (!status?.survey) {
    return <main className="flex min-h-screen items-center justify-center p-6">No active survey found.</main>;
  }

  if (status.survey.isExpired) {
    return <main className="flex min-h-screen items-center justify-center p-6">This survey has expired.</main>;
  }

  const onNext = () => {
    dispatch({ type: "SET_STEP", payload: Math.min(state.step + 1, totalSteps - 1) });
  };

  const onBack = () => {
    dispatch({ type: "SET_STEP", payload: Math.max(state.step - 1, 0) });
  };

  const isCurrentStepValid = () => {
    if (!currentQuestion) return true;
    const value = state.answers[currentQuestion._id];
    const strValue = String(value ?? "");

    // Required check
    if (currentQuestion.isRequired) {
      if (Array.isArray(value)) {
        if (value.length === 0) return false;
      } else {
        if (value === undefined || value === "" || strValue.trim() === "") return false;
      }
    }

    // Min character limit check for text inputs
    if (currentQuestion.type === "text" && currentQuestion.minCharacterLimit) {
      if (currentQuestion.isRequired || (value !== undefined && strValue.length > 0)) {
        if (strValue.length < currentQuestion.minCharacterLimit) return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    setSubmitError("");
    const payload = [
      ...Object.entries(state.answers).map(([questionId, value]) => ({
        questionId,
        questionType: questions.find((question) => question._id === questionId)?.type ?? "text",
        value,
      })),
      {
        questionId: "suggestions",
        questionType: "text",
        value: state.suggestions,
      },
    ];

    const response = await fetch("/api/survey/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surveyId: status.surveyId, group: status.assignedGroup, persona: selectedPersona, answers: payload }),
    });

    if (!response.ok) {
      const body = await response.json();
      setSubmitError(body.error ?? "Submission failed");
      return;
    }

    setStatus({ ...status, hasSubmitted: true });
  };

  return (
    <main className="flex min-h-screen flex-col bg-[var(--background)]">
      {state.step > 0 && (
        <div className="sticky top-0 z-30 bg-[var(--background)] px-4 pt-4">
          <div className="h-1 w-full overflow-hidden rounded bg-[var(--muted)]">
            <motion.div
              layoutId="survey-progress"
              className="h-full bg-[var(--primary)]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {state.step <= questions.length
              ? `Step ${state.step} of ${questions.length}`
              : `Step ${questions.length + 1} of ${questions.length + 1}`}
          </p>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-6 pb-28 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={state.step}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {state.step === 0 ? (
              <Card className="space-y-4">
                {shouldSkipIntro ? (
                  <div className="space-y-2 pb-2 border-b border-[var(--border)]">
                    <h1 className="text-2xl font-semibold text-[var(--foreground)]">
                      {status.survey.title}
                    </h1>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Please choose the role you wish to submit feedback for to begin.
                    </p>
                  </div>
                ) : (
                  <>
                    <motion.div variants={heroVariants} initial="hidden" animate="visible" className="space-y-3">
                      <motion.h1 variants={heroLine} className="text-3xl font-semibold text-[var(--foreground)]">
                        {status.survey.title}
                      </motion.h1>
                      <motion.div
                        variants={heroLine}
                        className="border-l-2 border-[var(--secondary)] pl-4 text-sm text-[var(--muted-foreground)] whitespace-pre-line break-words"
                      >
                        <LinkifyText text={status.survey.introduction} />
                      </motion.div>
                      <motion.div variants={heroLine} className="space-y-2">
                        <p className="text-base font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                          Instructions
                        </p>
                        <p className="pl-2 text-[var(--foreground)] whitespace-pre-line break-words">
                          <LinkifyText text={status.survey.description} />
                        </p>
                      </motion.div>
                    </motion.div>
                    <div className="space-y-2">
                      <p className="text-base font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                        Disclaimer
                      </p>
                      <p className="pl-2 text-[var(--foreground)] whitespace-pre-line break-words">
                        <LinkifyText text={status.survey.disclaimer} />
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-[var(--muted-foreground)]">
                      <p>Created: {format(new Date(status.survey.createdAt), "PPP")}</p>
                      <p>
                        Expires: {status.survey.expiresAt ? format(new Date(status.survey.expiresAt), "PPP") : "No expiry"}
                      </p>
                      <p>Estimated: {status.survey.estimatedMinutes ?? "N/A"} minutes</p>
                      <p className="whitespace-pre-line break-words">
                        <LinkifyText text={status.survey.instructions} />
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-4 rounded-[var(--radius)] border border-[var(--border)] p-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[var(--foreground)]">Your assigned group</p>
                    <p className="min-h-11 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-[var(--foreground)]">
                      {status.assignedGroup}
                    </p>
                  </div>

                  {status.survey.hasPersonas !== false && (
                    <div className="space-y-2">
                      <label htmlFor="survey-persona" className="text-sm font-medium text-[var(--foreground)]">
                        Select a role to review
                      </label>
                      <select
                        id="survey-persona"
                        value={selectedPersona}
                        disabled={!status.assignedGroup || availablePersonas.length === 0}
                        onChange={(event) => setSelectedPersona(event.target.value)}
                        className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--background)] px-3 py-2 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">
                          {!status.assignedGroup ? "No group assigned" : "Choose a role"}
                        </option>
                        {availablePersonas.map((persona) => (
                          <option key={persona.key} value={persona.key}>
                            {persona.label}
                          </option>
                        ))}
                      </select>
                      {status.assignedGroup ? (
                        <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
                          {(status.personaOptions ?? []).map((persona) => (
                            <span key={persona.key} className="rounded-full border border-[var(--border)] px-2 py-1">
                              {persona.label}: {personaCounts[persona.key] ?? 0}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                <Button onClick={onNext} disabled={!isSetupComplete}>
                  Begin Survey
                </Button>
              </Card>
            ) : currentQuestion ? (
              <Card className="space-y-4">
                <h2 className="text-xl font-semibold whitespace-pre-line break-words">
                  <LinkifyText text={currentQuestion.prompt} />
                </h2>
                {currentQuestion.type === "text" ? (
                  <>
                    <textarea
                      value={String(state.answers[currentQuestion._id] ?? "")}
                      onChange={(event) =>
                        dispatch({
                          type: "SET_ANSWER",
                          questionId: currentQuestion._id,
                          value: event.target.value.slice(0, currentQuestion.characterLimit ?? 1000),
                        })
                      }
                      placeholder={currentQuestion.placeholder}
                      className="min-h-32 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--background)] p-3"
                    />
                    <div className="flex flex-col sm:flex-row justify-between gap-1 text-sm text-[var(--muted-foreground)]">
                      {currentQuestion.minCharacterLimit && String(state.answers[currentQuestion._id] ?? "").length < currentQuestion.minCharacterLimit ? (
                        <span className="text-[var(--destructive)] font-medium">
                          Minimum {currentQuestion.minCharacterLimit} characters required (currently {String(state.answers[currentQuestion._id] ?? "").length})
                        </span>
                      ) : (
                        <span>Satisfies character requirements</span>
                      )}
                      <span>
                        {(currentQuestion.characterLimit ?? 1000) - String(state.answers[currentQuestion._id] ?? "").length} characters remaining
                      </span>
                    </div>
                  </>
                ) : null}

                {(currentQuestion.type === "radio" || currentQuestion.type === "checkbox") && currentQuestion.options ? (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => {
                      const selectedValue = state.answers[currentQuestion._id];
                      const isChecked = Array.isArray(selectedValue)
                        ? selectedValue.includes(option)
                        : selectedValue === option;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            if (currentQuestion.type === "radio") {
                              dispatch({ type: "SET_ANSWER", questionId: currentQuestion._id, value: option });
                              return;
                            }
                            const current = Array.isArray(selectedValue) ? selectedValue : [];
                            dispatch({
                              type: "SET_ANSWER",
                              questionId: currentQuestion._id,
                              value: isChecked ? current.filter((item) => item !== option) : [...current, option],
                            });
                          }}
                          className={`flex min-h-11 w-full items-center gap-3 rounded-[var(--radius)] border px-3 py-2 text-left transition-colors ${
                            isChecked
                              ? "border-[var(--primary)] bg-[var(--primary)]/5"
                              : "border-[var(--border)] bg-[var(--card)]"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center border border-[var(--primary)] text-[var(--primary-foreground)] ${
                              currentQuestion.type === "checkbox" ? "rounded-[3px]" : "rounded-full"
                            } ${isChecked ? "bg-[var(--primary)]" : "bg-transparent"}`}
                          >
                            {isChecked && currentQuestion.type === "checkbox" && (
                              <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {currentQuestion.type === "dropdown" && currentQuestion.options ? (
                  <select
                    value={String(state.answers[currentQuestion._id] ?? "")}
                    onChange={(event) =>
                      dispatch({ type: "SET_ANSWER", questionId: currentQuestion._id, value: event.target.value })
                    }
                    className="min-h-11 w-full rounded-[var(--radius)] border border-[var(--primary)] bg-[var(--background)] px-3 py-2"
                  >
                    <option value="">Select an option</option>
                    {currentQuestion.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : null}

                {currentQuestion.type === "rating" ? (
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const current = Number(state.answers[currentQuestion._id] ?? 0);
                      return (
                        <motion.button
                          key={value}
                          type="button"
                          onClick={() => dispatch({ type: "SET_ANSWER", questionId: currentQuestion._id, value })}
                          whileTap={{ scale: 0.85 }}
                          whileHover={{ scale: 1.15 }}
                          className="inline-flex min-h-11 min-w-11 items-center justify-center transition-colors"
                        >
                          <Star
                            className={`h-8 w-8 transition-colors duration-150 ${
                              current >= value
                                ? "fill-[var(--primary)] text-[var(--primary)]"
                                : "fill-transparent text-[var(--primary)]"
                            }`}
                          />
                        </motion.button>
                      );
                    })}
                  </div>
                ) : null}
              </Card>
            ) : (
              <Card className="space-y-4">
                <h2 className="text-xl font-semibold">Any additional comments or suggestions?</h2>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Optional (Your feedback is completely anonymous)
                </p>
                <textarea
                  value={state.suggestions}
                  onChange={(event) => dispatch({ type: "SET_SUGGESTIONS", payload: event.target.value.slice(0, 1000) })}
                  className="min-h-40 w-full rounded-[var(--radius)] border border-[var(--input)] bg-[var(--background)] p-3"
                />
                <p className="text-sm text-[var(--muted-foreground)]">{1000 - state.suggestions.length} characters remaining</p>
                {submitError ? <p className="text-sm text-[var(--destructive)]">{submitError}</p> : null}
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {state.step > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--background)] p-3 md:static md:border-0 md:px-4">
          <div className="mx-auto flex max-w-3xl justify-between gap-3">
            <Button onClick={onBack} disabled={state.step === 0}>
              Back
            </Button>
            {state.step === totalSteps - 1 ? (
              <Button onClick={handleSubmit}>Submit</Button>
            ) : (
              <Button onClick={onNext} disabled={!isCurrentStepValid()}>
                Next
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Floating Info Button & Closable Popup */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsInfoOpen((prev) => !prev)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
          title="View Instructions & Disclaimer"
          aria-label="View Instructions & Disclaimer"
        >
          <Info className="h-6 w-6" />
        </button>
      </div>

      <AnimatePresence>
        {isInfoOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 z-50 w-[90vw] max-w-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <h3 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                <Info className="h-4 w-4 text-[var(--primary)]" />
                Instructions & Disclaimer
              </h3>
              <button
                onClick={() => setIsInfoOpen(false)}
                className="rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-4 pr-1 text-sm text-[var(--foreground)]">
              {status.survey.description ? (
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--muted-foreground)] uppercase tracking-wide text-xs">
                    Instructions
                  </p>
                  <p className="whitespace-pre-line break-words pl-1 text-[var(--foreground)]">
                    <LinkifyText text={status.survey.description} />
                  </p>
                </div>
              ) : null}
              {status.survey.disclaimer ? (
                <div className="space-y-1">
                  <p className="font-semibold text-[var(--muted-foreground)] uppercase tracking-wide text-xs">
                    Disclaimer
                  </p>
                  <p className="whitespace-pre-line break-words pl-1 text-[var(--foreground)]">
                    <LinkifyText text={status.survey.disclaimer} />
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function SurveyPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center">Loading...</main>}>
      <SurveyContent />
    </Suspense>
  );
}
