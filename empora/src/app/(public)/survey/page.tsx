"use client";

import { ComponentProps, MouseEvent, useMemo, useRef, useState } from "react";

import { surveyQuestionsMock, SurveyOptionValue } from "@/shared/mocks/survey";

type SurveyPayload = {
  answers: Array<{
    questionId: string;
    value: SurveyOptionValue;
  }>;
  commentHtml: string | null;
};

type FormOnSubmit = NonNullable<ComponentProps<"form">["onSubmit"]>;

const SCALE_COLORS: Record<SurveyOptionValue, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#84cc16",
  5: "#22c55e",
};

const STEP_DELAY_MS = 1000;

function toSafeCommentHtml(input: string): string | null {
  const normalized = input.trim();

  if (!normalized) {
    return null;
  }

  return normalized
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("\n", "<br />");
}

function getValueFromClickPosition(
  event: MouseEvent<HTMLButtonElement>
): SurveyOptionValue {
  const { left, width } = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - left;
  const ratio = Math.min(1, Math.max(0, x / width));
  const rawValue = Math.floor(ratio * 5) + 1;
  const boundedValue = Math.min(5, Math.max(1, rawValue));

  return boundedValue as SurveyOptionValue;
}

export default function SurveyPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [answers, setAnswers] = useState<Record<string, SurveyOptionValue>>({});
  const [comment, setComment] = useState("");
  const [submittedPayload, setSubmittedPayload] =
    useState<SurveyPayload | null>(null);
  const stepTimeoutRef = useRef<number | null>(null);

  const questionsCount = surveyQuestionsMock.length;
  const isCommentStep = currentStep >= questionsCount;
  const currentQuestion = surveyQuestionsMock[currentStep];
  const selectedValue = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;

  const scaleGradient = useMemo(
    () =>
      `linear-gradient(90deg, ${SCALE_COLORS[1]} 0%, ${SCALE_COLORS[2]} 25%, ${SCALE_COLORS[3]} 50%, ${SCALE_COLORS[4]} 75%, ${SCALE_COLORS[5]} 100%)`,
    []
  );

  const goToNextStepWithDelay = () => {
    setIsTransitioning(true);

    stepTimeoutRef.current = window.setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, questionsCount));
      setIsTransitioning(false);
      stepTimeoutRef.current = null;
    }, STEP_DELAY_MS);
  };

  const handleSelectValue = (value: SurveyOptionValue) => {
    if (!currentQuestion || isTransitioning) {
      return;
    }

    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
    goToNextStepWithDelay();
  };

  const handleScaleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const value = getValueFromClickPosition(event);

    handleSelectValue(value);
  };

  const handleBack = () => {
    if (stepTimeoutRef.current) {
      window.clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = null;
      setIsTransitioning(false);
    }

    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit: FormOnSubmit = (event) => {
    event.preventDefault();

    const payload: SurveyPayload = {
      answers: surveyQuestionsMock.map((question) => ({
        questionId: question.id,
        value: answers[question.id],
      })),
      commentHtml: toSafeCommentHtml(comment),
    };

    setSubmittedPayload(payload);
  };

  return (
    <section className="space-y-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Survey</h1>

      {!isCommentStep && currentQuestion ? (
        <div className="space-y-5">
          <p className="text-sm tex-main-color/60">
            Question {currentStep + 1} of {questionsCount}
          </p>

          <h2 className="text-xl font-medium">{currentQuestion.title}</h2>

          {currentStep > 0 && (
            <button
              className="inline-flex items-center gap-1 rounded-md border border-black/20 px-3 py-1 text-sm"
              disabled={isTransitioning}
              onClick={handleBack}
              type="button"
            >
              ← Back
            </button>
          )}

          <button
            aria-label="Choose your answer on the scale"
            className="relative h-5 w-full rounded-full ring-1 ring-black/20"
            disabled={isTransitioning}
            onClick={handleScaleClick}
            style={{ background: scaleGradient }}
            type="button"
          >
            {selectedValue && (
              <span
                className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                style={{ left: `${((selectedValue - 0.5) / 5) * 100}%` }}
              />
            )}
          </button>

          <div className="grid grid-cols-5 gap-2 text-center text-xs tex-main-color/70">
            {currentQuestion.options.map((option) => (
              <button
                className="rounded px-2 py-1 hover:bg-black/5 disabled:cursor-not-allowed"
                disabled={isTransitioning}
                key={option.value}
                onClick={() => handleSelectValue(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <p className="text-sm tex-main-color/50">
            {isTransitioning
              ? "Saving answer and moving to the next question..."
              : "Click on the colored scale to answer."}
          </p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <button
              className="inline-flex items-center gap-1 rounded-md border border-black/20 px-3 py-1 text-sm"
              onClick={handleBack}
              type="button"
            >
              ← Back
            </button>
          </div>
          <p className="text-sm tex-main-color/60">Final step</p>
          <h2 className="text-xl font-medium">Additional comment (optional)</h2>
          <textarea
            className="min-h-28 w-full rounded-md border accent-color px-3 py-2 text-sm outline-none ring-0"
            onChange={(event) => setComment(event.target.value)}
            placeholder="Share details if you want"
            value={comment}
          />
          <button
            className="rounded-md submit-button px-4 py-2 text-sm font-medium text-white"
            type="submit"
          >
            Submit survey
          </button>
        </form>
      )}

      {submittedPayload && (
        <pre className="overflow-auto rounded-md border border-black/10 bg-black/[0.03] p-4 text-xs">
          {JSON.stringify(submittedPayload, null, 2)}
        </pre>
      )}
    </section>
  );
}
