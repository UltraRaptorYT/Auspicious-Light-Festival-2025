"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Lang, QuestionType } from "@/types";
import { toast } from "sonner";
import { gameMessages } from "@/translate";
type MatchQuestionFormProps = {
  question: QuestionType;
  lang: Lang;
  onCorrect: () => Promise<void> | void;
};

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(str: string) {
  return str.replace(/\s+/g, " ").trim();
}

export default function MatchQuestionForm({
  question,
  lang,
  onCorrect,
}: MatchQuestionFormProps) {
  if (question.qn.type !== "MATCH") return null;

  const isEn = lang === "en";
  const qn = question.qn;
  const answers = isEn ? qn.answer_en : qn.answer_zh;

  const leftLabels = Object.keys(answers);

  // assignments: which benefit text is assigned to each left label
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    () =>
      leftLabels.reduce((acc, key) => {
        acc[key] = null;
        return acc;
      }, {} as Record<string, string | null>)
  );

  // benefitPool: shuffled list of all benefit texts for this question/lang
  const [benefitPool, setBenefitPool] = useState<string[]>(() =>
    shuffleArray(Object.values(answers))
  );

  const [dragValue, setDragValue] = useState<string | null>(null);

  // Re-init when question or language changes
  useEffect(() => {
    const newAnswers = isEn ? qn.answer_en : qn.answer_zh;
    const newLeft = Object.keys(newAnswers);

    setAssignments(
      newLeft.reduce((acc, key) => {
        acc[key] = null;
        return acc;
      }, {} as Record<string, string | null>)
    );
    setBenefitPool(shuffleArray(Object.values(newAnswers)));
    setDragValue(null);
  }, [question.id, lang]);

  // rightOptions are just benefitPool minus anything currently assigned
  const assignedValues = Object.values(assignments).filter(
    (v): v is string => v != null
  );
  const rightOptions = benefitPool.filter((b) => !assignedValues.includes(b));

  const handleDragStart =
    (value: string) => (e: React.DragEvent<HTMLButtonElement>) => {
      setDragValue(value);
      e.dataTransfer.effectAllowed = "move";
    };

  const handleDropOnLeft =
    (leftLabel: string) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!dragValue) return;

      setAssignments((prev) => {
        const next = { ...prev };

        // Remove dragValue from whatever slot had it previously
        for (const key of Object.keys(next)) {
          if (next[key] === dragValue) {
            next[key] = null;
          }
        }

        // Place in target slot (overwrites whatever was there)
        next[leftLabel] = dragValue;

        return next;
      });

      setDragValue(null);
    };

  const handleReset = () => {
    setAssignments(
      leftLabels.reduce((acc, key) => {
        acc[key] = null;
        return acc;
      }, {} as Record<string, string | null>)
    );
    setBenefitPool(shuffleArray(Object.values(answers)));
    setDragValue(null);
  };

  const handleSubmit = async () => {
    const allFilled = Object.values(assignments).every((v) => v !== null);
    if (!allFilled) {
      toast.error(
        isEn
          ? "Please match all items before submitting."
          : "请先完成所有配对再提交。"
      );
      return;
    }

    const allCorrect = Object.entries(answers).every(([left, right]) => {
      const assigned = assignments[left];
      if (!assigned) return false;
      return normalize(assigned) === normalize(right);
    });

    if (!allCorrect) {
      toast.error(gameMessages[lang].incorrectAnswer);
      // 🔁 Reset everything on wrong answer
      handleReset();
      return;
    }

    toast.success(gameMessages[lang].correctAnswer);
    await onCorrect();
  };

  return (
    <div className="space-y-4">
      <p className="font-medium">{isEn ? qn.question_en : qn.question_zh}</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="font-semibold text-center">{qn.left[lang]}</p>
          <div className="space-y-3">
            {leftLabels.map((left) => (
              <div key={left} className="flex flex-col gap-2">
                <div className="rounded-md border px-3 py-2 bg-muted font-semibold">
                  {left}
                </div>

                <div
                  className="min-h-12 rounded-md border border-dashed px-3 py-2 text-sm flex items-center justify-center text-center bg-background"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDropOnLeft(left)}
                >
                  {assignments[left] ?? (
                    <span className="text-muted-foreground">
                      {qn.dropbox[lang]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-semibold text-center">{qn.right[lang]}</p>
          <div className="flex flex-col gap-2">
            {rightOptions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                {qn.used[lang]}
              </p>
            )}
            {rightOptions.map((opt) => (
              <button
                key={opt} // unique key even if two benefits share the same text
                draggable
                onDragStart={handleDragStart(opt)}
                className="rounded-md border px-3 py-2 text-sm text-left bg-card hover:bg-accent transition"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ACTION ROW */}
      <div className="flex items-center justify-center gap-3 pt-2">
        <Button type="button" onClick={handleSubmit}>
          {gameMessages[lang].submitLabel}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          {isEn ? "Reset" : "重置"}
        </Button>
      </div>
    </div>
  );
}
