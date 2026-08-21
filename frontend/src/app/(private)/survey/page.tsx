"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, Survey } from "@/shared/api/client";

export default function SurveyPage() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("Loading survey...");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void api
      .surveys()
      .then(async (items) => {
        if (cancelled) return;
        if (!items.length) {
          setStatus("There are no active surveys.");
          return;
        }
        if (items.length > 1) {
          setStatus(
            `Survey data integrity error: expected one active survey, but received ${items.length}.`,
          );
          return;
        }

        const activeSurvey = await api.survey(items[0].id);
        if (cancelled) return;
        setSurvey(activeSurvey);
        setStep(0);
        setStatus("");
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setStatus(
            error instanceof Error ? error.message : "Unable to load survey",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!survey) {
    return (
      <section className="py-10">
        <p role={status.includes("error") ? "alert" : "status"}>{status}</p>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="space-y-4 py-10" aria-labelledby="survey-complete">
        <h1
          className="text-3xl font-semibold tracking-tight"
          id="survey-complete"
        >
          Survey complete
        </h1>
        <p role="status">
          {alreadySubmitted
            ? "You have already submitted this survey."
            : "Thank you. Your response has been submitted."}
        </p>
      </section>
    );
  }

  const lastStep = survey.questions.length;
  const safeStep = Math.min(Math.max(step, 0), lastStep);
  const question = survey.questions[safeStep];
  const isCommentStep = safeStep === lastStep;

  async function submit() {
    if (!survey || submittingRef.current) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setStatus("");
    try {
      await api.submitSurvey(survey.id, {
        answers: survey.questions.map((item) => ({
          questionId: item.id,
          optionId: answers[item.id],
        })),
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 409) {
        setAlreadySubmitted(true);
        setSubmitted(true);
      } else {
        setStatus(error instanceof Error ? error.message : "Unable to submit");
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-busy={isSubmitting}
      className="space-y-6 py-10"
      aria-labelledby="survey-title"
    >
      <div>
        <h1
          className="text-3xl font-semibold tracking-tight"
          id="survey-title"
        >
          {survey.title}
        </h1>
        <p className="mt-2 text-sm text-black/60">{survey.description}</p>
      </div>

      {!isCommentStep && question ? (
        <div className="space-y-5">
          <p className="text-sm text-black/60">
            Question {safeStep + 1} of {survey.questions.length}
          </p>
          <h2 className="text-xl font-medium" id={`question-${question.id}`}>
            {question.title}
          </h2>
          <div
            aria-labelledby={`question-${question.id}`}
            className="grid gap-2 sm:grid-cols-5"
            role="group"
          >
            {question.options.map((option) => (
              <button
                aria-pressed={answers[question.id] === option.id}
                className={`rounded-md border px-3 py-3 text-sm ${
                  answers[question.id] === option.id
                    ? "border-black bg-black text-white"
                    : "border-black/20"
                }`}
                disabled={isSubmitting}
                key={option.id}
                onClick={() => {
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: option.id,
                  }));
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={!answers[question.id] || isSubmitting}
            onClick={() =>
              setStep((current) => Math.min(current + 1, lastStep))
            }
            type="button"
          >
            Next
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-medium" id="survey-comment-label">
            Additional comment (optional)
          </h2>
          <textarea
            aria-labelledby="survey-comment-label"
            className="min-h-28 w-full rounded-md border border-black/20 px-3 py-2"
            disabled={isSubmitting}
            maxLength={2000}
            onChange={(event) => setComment(event.target.value)}
            value={comment}
          />
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => void submit()}
            type="button"
          >
            {isSubmitting ? "Submitting..." : "Submit survey"}
          </button>
        </div>
      )}

      {safeStep > 0 && !status && (
        <button
          className="rounded-md border border-black/20 px-3 py-1 text-sm"
          disabled={isSubmitting}
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          type="button"
        >
          ← Back
        </button>
      )}
      {status && (
        <p className="text-sm text-black/60" role="alert">
          {status}
        </p>
      )}
    </section>
  );
}
