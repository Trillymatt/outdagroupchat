"use client";

import { PREFERENCE_QUESTIONS, type PreferenceAnswers } from "@/lib/utils/trip-preferences";
import { cn } from "@/lib/utils/cn";

export function PreferenceQuestions({
  answers,
  onChange,
}: {
  answers: PreferenceAnswers;
  onChange: (answers: PreferenceAnswers) => void;
}) {
  function toggle(questionKey: string, option: string) {
    const current = answers[questionKey] ?? [];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    onChange({ ...answers, [questionKey]: next });
  }

  return (
    <div className="space-y-4">
      {PREFERENCE_QUESTIONS.map((q) => (
        <div key={q.key}>
          <p className="mb-1.5 text-sm font-medium text-ink">{q.question}</p>
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((option) => {
              const selected = (answers[q.key] ?? []).includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(q.key, option)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected ? "border-green bg-green/10 text-green-dark" : "border-line bg-paper text-ink-soft hover:border-green/40",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
