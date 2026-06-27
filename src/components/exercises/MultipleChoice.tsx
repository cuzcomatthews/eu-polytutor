import { useState } from "react";

import type { ExerciseProps } from "./types";

export function MultipleChoice({ exercise, onAnswerChange, disabled }: ExerciseProps) {
  const payload = exercise.payload as Record<string, unknown>;
  const options = (payload.options as string[]) ?? [];
  const hint = payload.hint as string | undefined;
  const [selected, setSelected] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const choose = (idx: number) => {
    if (disabled) return;
    setSelected(idx);
    onAnswerChange({ selected_index: idx });
  };

  return (
    <div>
      {hint && (
        <div className="mb-3">
          {!showHint ? (
            <button onClick={() => setShowHint(true)} className="text-xs opacity-40 hover:opacity-70 underline">
              Show Hint
            </button>
          ) : (
            <p className="text-xs p-2 rounded-lg" style={{ background: "var(--color-input)", color: "var(--color-sidebar-text)" }}>
              {hint}
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3">
        {options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => choose(idx)}
            disabled={disabled}
            className="rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition"
            style={{
              borderColor: selected === idx
                ? "var(--color-accent)"
                : "var(--color-border)",
              background: selected === idx
                ? "rgba(99,102,241,0.08)"
                : "var(--color-card)",
            }}
          >
            <span className="mr-3 inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold"
              style={{
                background: selected === idx ? "var(--color-accent)" : "var(--color-input)",
                color: selected === idx ? "white" : "inherit",
              }}>
              {String.fromCharCode(65 + idx)}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
