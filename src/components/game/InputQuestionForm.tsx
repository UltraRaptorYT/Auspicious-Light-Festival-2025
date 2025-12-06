"use client";

import { useState, useEffect, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Lang, QuestionType } from "@/types";
import { toast } from "sonner";
import { gameMessages } from "@/translate";
import { DialogClose } from "@/components/ui/dialog";

type InputQuestionFormProps = {
  question: QuestionType;
  lang: Lang;
  onCorrect: () => Promise<void> | void;
  onGiveUp: () => void;
};

export default function InputQuestionForm({
  question,
  lang,
  onCorrect,
  onGiveUp,
}: InputQuestionFormProps) {
  if (question.qn.type !== "INPUT") return null;
  const qn = question.qn;

  const correctAnswer = lang === "en" ? qn.answer_en : qn.answer_zh;
  const [answerInput, setAnswerInput] = useState("");

  useEffect(() => {
    // reset when question or language changes
    setAnswerInput("");
  }, [question.id, lang]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const userAnswer = String(answerInput).trim();

    let isCorrect = userAnswer.toUpperCase() === correctAnswer.toUpperCase();

    // keep your special case for q30
    if (question.id === 30) {
      console.log(correctAnswer, userAnswer);
      isCorrect = userAnswer.includes(correctAnswer);
    }

    if (!isCorrect) {
      toast.error(gameMessages[lang].incorrectAnswer);
      return;
    }

    toast.success(gameMessages[lang].correctAnswer);
    await onCorrect();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p>{lang === "en" ? question.qn.question_en : question.qn.question_zh}</p>

      <div className="grid items-center gap-3">
        <Label htmlFor="answer">{gameMessages[lang].answerLabel}</Label>
        <Input
          id="answer"
          type="text"
          placeholder={gameMessages[lang].answerLabel}
          value={answerInput}
          onChange={(e) => setAnswerInput(e.target.value)}
        />
      </div>

      {/* ACTION ROW */}
      <div className="flex flex-row items-center justify-center gap-3">
        <DialogClose asChild>
          <Button type="button" variant="destructive" onClick={onGiveUp}>
            {gameMessages[lang].giveUpLabel}
          </Button>
        </DialogClose>

        <Button type="submit">{gameMessages[lang].submitLabel}</Button>
      </div>
    </form>
  );
}
