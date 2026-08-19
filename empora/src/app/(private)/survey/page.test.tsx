import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type Survey } from "@/shared/api/client";
import SurveyPage from "./page";

const { surveysMock, surveyMock, submitSurveyMock } = vi.hoisted(() => ({
  surveysMock: vi.fn(),
  surveyMock: vi.fn(),
  submitSurveyMock: vi.fn(),
}));

vi.mock("@/shared/api/client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/shared/api/client")>();

  return {
    ...original,
    api: {
      ...original.api,
      surveys: surveysMock,
      survey: surveyMock,
      submitSurvey: submitSurveyMock,
    },
  };
});

const activeSurvey: Survey = {
  id: "survey-1",
  title: "Team pulse",
  description: "Tell us how the team is doing.",
  isAnonymous: true,
  questions: [
    {
      id: "question-1",
      title: "How are you feeling?",
      position: 1,
      options: [
        { id: "option-1", value: 1, label: "Not great" },
        { id: "option-2", value: 5, label: "Great" },
      ],
    },
    {
      id: "question-2",
      title: "How supported do you feel?",
      position: 2,
      options: [
        { id: "option-3", value: 1, label: "Unsupported" },
        { id: "option-4", value: 5, label: "Supported" },
      ],
    },
  ],
};

async function renderLoadedSurvey() {
  render(<SurveyPage />);
  expect(
    await screen.findByRole("heading", { name: activeSurvey.title }),
  ).toBeInTheDocument();
}

async function reachCommentStep() {
  await renderLoadedSurvey();
  fireEvent.click(screen.getByRole("button", { name: "Great" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  fireEvent.click(screen.getByRole("button", { name: "Supported" }));
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(
    screen.getByRole("heading", { name: "Additional comment (optional)" }),
  ).toBeInTheDocument();
}

describe("SurveyPage", () => {
  beforeEach(() => {
    surveysMock.mockReset();
    surveyMock.mockReset();
    submitSurveyMock.mockReset();
    surveysMock.mockResolvedValue([activeSurvey]);
    surveyMock.mockResolvedValue(activeSurvey);
    submitSurveyMock.mockResolvedValue(undefined);
  });

  it("reports an integrity error when the API returns multiple active surveys", async () => {
    surveysMock.mockResolvedValue([
      activeSurvey,
      { ...activeSurvey, id: "survey-2" },
    ]);

    render(<SurveyPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Survey data integrity error: expected one active survey, but received 2.",
    );
    expect(surveyMock).not.toHaveBeenCalled();
  });

  it("does not skip questions after rapid answer changes", async () => {
    await renderLoadedSurvey();

    fireEvent.click(screen.getByRole("button", { name: "Not great" }));
    fireEvent.click(screen.getByRole("button", { name: "Great" }));

    expect(
      screen.getByRole("heading", { name: "How are you feeling?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Great" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getByRole("heading", {
        name: "How supported do you feel?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Additional comment (optional)" }),
    ).not.toBeInTheDocument();
  });

  it("blocks duplicate submissions and disables controls while submitting", async () => {
    let resolveSubmission!: () => void;
    submitSurveyMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSubmission = resolve;
      }),
    );
    await reachCommentStep();

    const submitButton = screen.getByRole("button", { name: "Submit survey" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    expect(submitSurveyMock).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Submitting..." }),
    ).toBeDisabled();
    expect(
      screen.getByRole("textbox", { name: "Additional comment (optional)" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "← Back" })).toBeDisabled();

    resolveSubmission();
    expect(
      await screen.findByRole("heading", { name: "Survey complete" }),
    ).toBeInTheDocument();
  });

  it("shows a separate completion screen after successful submission", async () => {
    await reachCommentStep();

    fireEvent.click(screen.getByRole("button", { name: "Submit survey" }));

    expect(
      await screen.findByRole("heading", { name: "Survey complete" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Thank you. Your response has been submitted.",
    );
    expect(
      screen.queryByRole("button", { name: "Submit survey" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("treats a 409 response as an already-submitted completion", async () => {
    submitSurveyMock.mockRejectedValue(
      new ApiError(409, "Response already exists"),
    );
    await reachCommentStep();

    fireEvent.click(screen.getByRole("button", { name: "Submit survey" }));

    expect(
      await screen.findByRole("heading", { name: "Survey complete" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "You have already submitted this survey.",
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
