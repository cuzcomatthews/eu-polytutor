import { useState, useEffect } from "react";

import type { ExerciseProps } from "./types";

export function Ordering({ exercise, onAnswerChange, disabled }: ExerciseProps) {
  const payload = exercise.payload as Record<string, unknown>;
  const items = (payload.items as string[]) ?? [];
  const hint = payload.hint as string | undefined;
  const [order, setOrder] = useState<number[]>([]);
  const [available, setAvailable] = useState<number[]>(items.map((_, i) => i));
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    onAnswerChange(order.length > 0 ? { order } : null);
  }, [order, onAnswerChange]);

  const addWord = (itemIdx: number) => {
    if (disabled) return;
    setOrder((prev) => [...prev, itemIdx]);
    setAvailable((prev) => prev.filter((i) => i !== itemIdx));
  };

  const removeWord = (posIdx: number) => {
    if (disabled) return;
    const itemIdx = order[posIdx];
    setOrder((prev) => prev.filter((_, i) => i !== posIdx));
    setAvailable((prev) => [...prev, itemIdx]);
  };

  // Shuffle available on mount
  const [shuffledAvailable] = useState(() => {
    const arr = [...available];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  return (
    <div>
      {hint && (
        <div className="mb-3">
          {!showHint ? (
            <button onClick={() => setShowHint(true)} className="text-xs opacity-40 hover:opacity-70 underline">
              Show Hint
            </button>
          ) : (
            <p className="text-sm p-2 rounded-lg" style={{ background: "var(--color-input)", color: "var(--color-muted)" }}>
              {hint}
            </p>
          )}
        </div>
      )}

      {/* Answer row */}
      <div className="flex flex-wrap gap-2 min-h-[48px] p-3 rounded-xl border-2 mb-3"
        style={{
          borderColor: order.length > 0 ? "var(--color-accent)" : "var(--color-border)",
          borderStyle: order.length === 0 ? "dashed" : "solid",
          background: "var(--color-card)",
        }}>
        {order.map((itemIdx, posIdx) => (
          <button
            key={`selected-${itemIdx}-${posIdx}`}
            onClick={() => removeWord(posIdx)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition"
            style={{
              borderColor: "var(--color-accent)",
              background: "rgba(99,102,241,0.1)",
            }}
          >
            {items[itemIdx]}
          </button>
        ))}
        {order.length === 0 && (
          <span className="text-xs opacity-30 self-center">Tap words below to build the sentence</span>
        )}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2">
        {(order.length === 0 ? shuffledAvailable : available).map((itemIdx) => (
          <button
            key={`word-${itemIdx}`}
            onClick={() => addWord(itemIdx)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition hover:shadow-sm"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-input)",
            }}
          >
            {items[itemIdx]}
          </button>
        ))}
      </div>
    </div>
  );
}
