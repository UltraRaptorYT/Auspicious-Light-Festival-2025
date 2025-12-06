"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Lang, QuestionType } from "@/types";
import { gameMessages } from "@/translate";

type SelectQuestionFormProps = {
  question: QuestionType;
  lang: Lang;
  onCorrect: (selectedKeys: string[]) => Promise<void> | void;
  onGiveUp?: () => void;
};

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

export default function SelectQuestionForm({
  question,
  lang,
  onCorrect,
  onGiveUp,
}: SelectQuestionFormProps) {
  if (question.qn.type !== "SELECT") return null;

  const qn = question.qn;
  const isMulti = !!qn.multi;

  const optionEntries = useMemo(() => {
    // Stable order by key (A, B, C...)
    return Object.entries(qn.options ?? {}).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [qn.options]);

  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      if (!isMulti) return [key];
      return prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev, key];
    });
  };

  const correctKeys = useMemo(() => {
    const ans = qn.answer;
    return Array.isArray(ans) ? ans : [ans];
  }, [qn.answer]);

  const handleSubmit = async () => {
    if (selected.length === 0) return;

    const ok = sameSet(
      selected.map((s) => s.toUpperCase()),
      correctKeys.map((c) => String(c).toUpperCase())
    );

    if (!ok) {
      toast.error(gameMessages[lang].incorrectAnswer);
      return;
    }

    toast.success(gameMessages[lang].correctAnswer);
    await onCorrect(selected);
  };

  const questionText = lang === "en" ? qn.question_en : qn.question_zh;

  return (
    <div className="space-y-4">
      <p className="text-base">{questionText}</p>

      <div className="grid grid-cols-1 gap-2">
        {optionEntries.map(([key, label]) => {
          const isSelected = selected.includes(key);
          const text = lang === "en" ? label.en : label.zh;

          return (
            <Button
              key={key}
              type="button"
              variant={isSelected ? "default" : "outline"}
              className="justify-start h-min"
              onClick={() => toggle(key)}
            >
              <span className="mr-2 font-semibold">{key}.</span>
              <span className="text-left text-wrap">{text}</span>
            </Button>
          );
        })}
      </div>

      <div className="flex flex-row items-center justify-center gap-3">
        {onGiveUp ? (
          <Button type="button" variant="destructive" onClick={onGiveUp}>
            {lang === "en" ? "I give up" : "我放弃"}
          </Button>
        ) : null}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={selected.length === 0}
        >
          {lang === "en" ? "Submit" : "提交"}
        </Button>
      </div>

      {isMulti ? (
        <p className="text-xs text-muted-foreground text-center">
          {lang === "en"
            ? "You may select multiple answers."
            : "您可以选择多个答案。"}
        </p>
      ) : null}
    </div>
  );
}
