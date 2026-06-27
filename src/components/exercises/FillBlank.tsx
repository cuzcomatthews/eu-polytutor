import { useState } from "react";

import type { ExerciseProps } from "./types";

export function FillBlank({ exercise, onAnswerChange, disabled }: ExerciseProps) {
  const payload = exercise.payload as Record<string, unknown>;
  const sentence = (payload.sentence as string) ?? "";
  const hint = payload.hint as string | undefined;
  const [before, after] = sentence.split("___");
  const [value, setValue] = useState("");
  const [showHint, setShowHint] = useState(false);

  return (
    <div>
      <p className="text-xl leading-relaxed">
        <span>{before}</span>
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => {
            setValue(e.target.value);
            onAnswerChange(e.target.value ? { text: e.target.value } : null);
          }}
          autoFocus
          className="mx-2 inline-block min-w-[100px] border-b-4 bg-transparent px-2 py-1 text-center font-bold focus:outline-none"
          style={{
            borderColor: "var(--color-accent)",
          }}
        />
        <span>{after}</span>
      </p>
      {hint && (
        <div className="mt-3">
          {!showHint ? (
            <button onClick={() => setShowHint(true)} className="text-xs opacity-40 hover:opacity-70 underline">
              Show Hint
            </button>
          ) : (
            <p className="text-xs p-2 rounded-lg" style={{ background: "var(--color-input)", color: "var(--color-muted)" }}>
              {hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
