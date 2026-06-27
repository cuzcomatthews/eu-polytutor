import { useState } from "react";

import type { ExerciseProps } from "./types";

export function TypeAnswer({ exercise, onAnswerChange, disabled }: ExerciseProps) {
  const payload = exercise.payload as Record<string, unknown>;
  const hint = payload.hint as string | undefined;
  const [value, setValue] = useState("");
  const [showHint, setShowHint] = useState(false);

  return (
    <div>
      {hint && (
        <div className="mb-3">
          {!showHint ? (
            <button onClick={() => setShowHint(true)} className="text-xs opacity-40 hover:opacity-70 underline">
              Show Hint
            </button>
          ) : (
            <p className="text-sm p-2 rounded-lg" style={{ background: "var(--color-input)", color: "var(--color-sidebar-text)" }}>
              {hint}
            </p>
          )}
        </div>
      )}
      <input
        type="text"
        value={value}
        disabled={disabled}
        autoFocus
        onChange={(e) => {
          setValue(e.target.value);
          onAnswerChange(e.target.value ? { text: e.target.value } : null);
        }}
        placeholder="Type your answer..."
        className="w-full rounded-xl border-2 px-4 py-3 text-lg focus:outline-none"
        style={{
          borderColor: value ? "var(--color-accent)" : "var(--color-border)",
          background: "var(--color-input)",
        }}
      />
    </div>
  );
}
