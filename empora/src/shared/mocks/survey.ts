export type SurveyOptionValue = 1 | 2 | 3 | 4 | 5;

export type SurveyOption = {
  value: SurveyOptionValue;
  label: string;
};

export type SurveyQuestion = {
  id: string;
  title: string;
  options: SurveyOption[];
};

export const surveyQuestionsMock: SurveyQuestion[] = [
  {
    id: "mood",
    title: "How did you feel in the past week?",
    options: [
      { value: 1, label: "Very low" },
      { value: 2, label: "A bit low" },
      { value: 3, label: "Neutral" },
      { value: 4, label: "Good" },
      { value: 5, label: "Excellent" },
    ],
  },
  {
    id: "sleep",
    title: "Communication with top-level management is frequent and clear enough.",
    options: [
      { value: 1, label: "Strongly disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Neither agree nor disagree" },
      { value: 4, label: "Agree" },
      { value: 5, label: "Strongly agree" },
    ],
  },
  {
    id: "energy",
    title: "My team helps me to do my best.",
    options: [
      { value: 1, label: "Strongly disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Neither agree nor disagree" },
      { value: 4, label: "Agree" },
      { value: 5, label: "Strongly agree" },
    ],
  },
];
