export type Lang = "en" | "zh";

export type UserRow = {
  id: string;
  name: string;
};

export type QuestionType = {
  id: number;
  qn: Qn;
  created_at: string;
};

type InputQuestion = {
  type: "INPUT";
  question_en: string;
  question_zh: string;
  answer_en: string;
  answer_zh: string;
};

type MatchQuestion = {
  type: "MATCH";
  question_en: string;
  question_zh: string;
  answer_en: Record<string, string>;
  answer_zh: Record<string, string>;
  left: Record<Lang, string>;
  right: Record<Lang, string>;
  dropbox: Record<Lang, string>;
  used: Record<Lang, string>;
};

export type SelectOption = {
  en: string;
  zh: string;
};

export type SelectQuestion = {
  type: "SELECT";
  question_en: string;
  question_zh: string;
  options: Record<string, SelectOption>;
  answer: string | string[];
  multi?: boolean;
};

// type FileQuestion = {
//   type: "FILE";
//   question: string;
//   src: string;
// };

// type GiftQuestion = {
//   type: "GIFT";
//   question: string;
// };

// type TaskQuestion = {
//   type: "TASK";
//   question: string;
// };

type Qn = InputQuestion | MatchQuestion | SelectQuestion;
