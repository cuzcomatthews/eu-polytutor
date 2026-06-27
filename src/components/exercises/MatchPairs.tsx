import { useMemo, useState, useEffect } from "react";

import type { ExerciseProps } from "./types";

interface Pair {
  left: string;
  right: string;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function MatchPairs({ exercise, onAnswerChange, disabled }: ExerciseProps) {
  const payload = exercise.payload as Record<string, unknown>;
  const pairs = (payload.pairs as Pair[]) ?? [];
  const lefts = useMemo(() => pairs.map((p) => p.left), [pairs]);
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right)), [pairs]);

  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});

  useEffect(() => {
    const allMatched = lefts.every((l) => matches[l]);
    onAnswerChange(
      allMatched
        ? { matches: lefts.map((l) => ({ left: l, right: matches[l] })) }
        : null
    );
  }, [matches, lefts, onAnswerChange]);

  const tryMatch = (right: string) => {
    if (disabled) return;
    if (!selectedLeft) return;
    setMatches((m) => ({ ...m, [selectedLeft]: right }));
    setSelectedLeft(null);
  };

  const usedRights = new Set(Object.values(matches));

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        {lefts.map((l) => (
          <button
            key={l}
            type="button"
            disabled={disabled}
            onClick={() => setSelectedLeft(l)}
            className="w-full rounded-xl border-2 px-3 py-3 text-sm font-bold transition"
            style={{
              borderColor: matches[l]
                ? "var(--color-success)"
                : selectedLeft === l
                ? "var(--color-accent)"
                : "var(--color-border)",
              background: matches[l]
                ? "rgba(34,197,94,0.1)"
                : selectedLeft === l
                ? "rgba(99,102,241,0.1)"
                : "var(--color-card)",
              color: matches[l] ? "var(--color-success)" : "inherit",
            }}
          >
            {l}
            {matches[l] && (
              <span className="block text-xs opacity-60 mt-0.5">→ {matches[l]}</span>
            )}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {rights.map((r) => (
          <button
            key={r}
            type="button"
            disabled={disabled || usedRights.has(r)}
            onClick={() => tryMatch(r)}
            className="w-full rounded-xl border-2 px-3 py-3 text-sm font-bold transition"
            style={{
              borderColor: usedRights.has(r)
                ? "var(--color-border)"
                : "var(--color-border)",
              background: usedRights.has(r)
                ? "rgba(0,0,0,0.05)"
                : "var(--color-card)",
              opacity: usedRights.has(r) ? 0.4 : 1,
            }}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
