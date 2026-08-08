"use client";

import { useEffect, useState } from "react";
import { api, Survey } from "@/shared/api/client";

export default function SurveyPage() {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("Loading survey...");

  useEffect(() => {
    void api
      .surveys()
      .then(async (items) => {
        if (!items.length) {
          setStatus("There are no active surveys.");
          return;
        }
        setSurvey(await api.survey(items[0].id));
        setStatus("");
      })
      .catch((error: unknown) =>
        setStatus(error instanceof Error ? error.message : "Unable to load survey"),
      );
  }, []);

  if (!survey) {
    return <section className="py-10">{status}</section>;
  }

  const question = survey.questions[step];
  const isCommentStep = step === survey.questions.length;

  async function submit() {
    if (!survey) return;
    setStatus("Submitting...");
    try {
      await api.submitSurvey(survey.id, {
        answers: survey.questions.map((item) => ({
          questionId: item.id,
          optionId: answers[item.id],
        })),
        comment: comment.trim() || undefined,
      });
      setStatus("Thank you. Your response has been submitted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to submit");
    }
  }

  return (
    <section className="space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{survey.title}</h1>
        <p className="mt-2 text-sm text-black/60">{survey.description}</p>
      </div>

      {!isCommentStep && question ? (
        <div className="space-y-5">
          <p className="text-sm text-black/60">
            Question {step + 1} of {survey.questions.length}
          </p>
          <h2 className="text-xl font-medium">{question.title}</h2>
          <div className="grid gap-2 sm:grid-cols-5">
            {question.options.map((option) => (
              <button
                className={`rounded-md border px-3 py-3 text-sm ${
                  answers[question.id] === option.id
                    ? "border-black bg-black text-white"
                    : "border-black/20"
                }`}
                key={option.id}
                onClick={() => {
                  setAnswers((current) => ({
                    ...current,
                    [question.id]: option.id,
                  }));
                  window.setTimeout(
                    () => setStep((current) => current + 1),
                    250,
                  );
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-medium">Additional comment (optional)</h2>
          <textarea
            className="min-h-28 w-full rounded-md border border-black/20 px-3 py-2"
            maxLength={2000}
            onChange={(event) => setComment(event.target.value)}
            value={comment}
          />
          <button
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
            onClick={() => void submit()}
            type="button"
          >
            Submit survey
          </button>
        </div>
      )}

      {step > 0 && !status && (
        <button
          className="rounded-md border border-black/20 px-3 py-1 text-sm"
          onClick={() => setStep((current) => current - 1)}
          type="button"
        >
          ← Back
        </button>
      )}
      {status && <p className="text-sm text-black/60">{status}</p>}
    </section>
  );
}
