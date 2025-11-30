export type Lang = "en" | "zh";

export type UserRow = {
  id: string;
  name: string;
};

export type QuestionType = {
  id: number;
  qn: Qn;
  type: "reward" | "noreward" | "empty" | "temptation" | "virtue";
  points: number;
  created_at: string;
};

type FileQuestion = {
  type: "FILE";
  question: string;
  src: string;
};

type InputQuestion = {
  type: "INPUT";
  question: string;
  answer: string;
};

type GiftQuestion = {
  type: "GIFT";
  question: string;
};

type TaskQuestion = {
  type: "TASK";
  question: string;
};

type Qn = FileQuestion | InputQuestion | GiftQuestion | TaskQuestion;
