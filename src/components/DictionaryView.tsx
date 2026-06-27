"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuthHeaders } from "@/context/AuthContext";

interface DictionaryEntry {
  id: string;
  word: string;
  translation: string;
  gender?: string | null;
  exampleSentence?: string | null;
  difficulty: number;
  tags: string[];
  timesReviewed: number;
}

interface Props {
  onProgressUpdate: () => void;
}

export default function DictionaryView({ onProgressUpdate }: Props) {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [newWord, setNewWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [practiceExercises, setPracticeExercises] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/dictionary?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {}
  }, [search]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addWord = async () => {
    if (!newWord.trim() || loading) return;
    setLoading(true);
    try {
      await fetch("/api/dictionary", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ word: newWord.trim() }),
      });
      setNewWord("");
      fetchEntries();
      onProgressUpdate();
    } catch {}
    setLoading(false);
  };

  const deleteWord = async (id: string) => {
    await fetch(`/api/dictionary/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    fetchEntries();
  };

  const toggleFlip = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startPractice = async () => {
    const ids = selectedIds.size > 0 ? Array.from(selectedIds) : entries.map((e) => e.id);
    if (!ids.length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/dictionary/practice", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds: ids }),
      });
      const data = await res.json();
      setPracticeExercises(data);
    } catch {}
    setLoading(false);
  };

  const difficultyEmoji = (d: number) => ["", "🟢", "🟡", "🟠", "🔴", "⚫"][d] || "🟢";

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pt-16 lg:pt-8 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold">Dictionary</h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-sidebar-text)" }}>
          Your personal vocabulary collection
        </p>
      </div>

      {/* Add word */}
      <div className="card animate-slide-up flex items-center gap-3">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addWord()}
          placeholder="Add a new word..."
          className="input-field flex-1"
        />
        <button onClick={addWord} disabled={loading || !newWord.trim()} className="btn-primary">
          {loading ? "..." : "Add"}
        </button>
      </div>

      {/* Search + Practice */}
      <div className="flex flex-col sm:flex-row gap-3 animate-slide-up">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search words..."
          className="input-field flex-1"
        />
        <button onClick={startPractice} disabled={loading || entries.length === 0} className="btn-primary text-sm whitespace-nowrap">
          {selectedIds.size > 0 ? `Practice (${selectedIds.size})` : "Practice All"}
        </button>
        {selectedIds.size > 0 && (
          <button onClick={() => setSelectedIds(new Set())} className="btn-ghost text-sm">
            Clear
          </button>
        )}
      </div>

      {/* Flashcards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {entries.map((entry) => (
          <div key={entry.id} className="animate-slide-up">
            <button
              onClick={() => toggleFlip(entry.id)}
              className="w-full aspect-[3/4] rounded-xl cursor-pointer relative transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "var(--color-card)",
                border: selectedIds.has(entry.id) ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
              }}
            >
              <div className="absolute top-2 left-2 text-xs opacity-70">
                {difficultyEmoji(entry.difficulty)}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelect(entry.id); }}
                className="absolute top-2 right-2 w-5 h-5 rounded border flex items-center justify-center text-xs"
                style={{
                  borderColor: "var(--color-border)",
                  background: selectedIds.has(entry.id) ? "var(--color-accent)" : "transparent",
                  color: selectedIds.has(entry.id) ? "white" : "transparent",
                }}
              >
                ✓
              </button>

              <div className="flex flex-col items-center justify-center h-full px-2">
                {flipped.has(entry.id) ? (
                  <>
                    <p className="text-base font-semibold text-center">{entry.translation}</p>
                    {entry.exampleSentence && (
                      <p className="text-xs mt-2 text-center opacity-60">{entry.exampleSentence}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-base font-semibold text-center">{entry.word}</p>
                    {entry.gender && (
                      <p className="text-xs mt-1" style={{ color: "var(--color-accent)" }}>{entry.gender}</p>
                    )}
                  </>
                )}
              </div>
            </button>
            <button
              onClick={() => deleteWord(entry.id)}
              className="w-full text-xs py-1 mt-1 rounded opacity-0 hover:opacity-100 transition-opacity"
              style={{ color: "var(--color-error)" }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {entries.length === 0 && !loading && (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-sm" style={{ color: "var(--color-sidebar-text)" }}>
            No words yet. Add your first word above!
          </p>
        </div>
      )}

      {/* Practice Exercises */}
      {practiceExercises?.exercises && (
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Practice Exercises</h3>
            <button onClick={() => setPracticeExercises(null)} className="btn-ghost text-sm">Close</button>
          </div>
          <div className="space-y-4">
            {practiceExercises.exercises.map((ex: any, i: number) => (
              <ExerciseItem key={i} exercise={ex} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseItem({ exercise, index }: { exercise: any; index: number }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ correct: boolean; feedback: string } | null>(null);

  const check = async () => {
    if (!answer.trim()) return;
    try {
      const res = await fetch("/api/lessons/evaluate", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          userAnswer: answer.trim(),
          expectedAnswer: exercise.answer,
          exerciseType: exercise.type,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {}
  };

  const renderExercise = () => {
    switch (exercise.type) {
      case "fill_blank":
        return (
          <>
            <p className="text-sm mb-2">{exercise.prompt || exercise.sentence}</p>
            {exercise.options && (
              <div className="flex flex-wrap gap-2 mb-2">
                {exercise.options.map((opt: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setAnswer(opt)}
                    className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
                    style={{
                      borderColor: answer === opt ? "var(--color-accent)" : "var(--color-border)",
                      background: answer === opt ? "rgba(99,102,241,0.1)" : "var(--color-input)",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </>
        );

      case "pick_translation":
        return (
          <>
            <p className="text-sm mb-2">{exercise.prompt || `Translate: ${exercise.sentence}`}</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {exercise.options?.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setAnswer(opt)}
                  className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
                  style={{
                    borderColor: answer === opt ? "var(--color-accent)" : "var(--color-border)",
                    background: answer === opt ? "rgba(99,102,241,0.1)" : "var(--color-input)",
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        );

      case "reorder":
        return (
          <>
            <p className="text-sm mb-2">{exercise.prompt || "Put words in order:"}</p>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type the correct sentence..."
              className="input-field"
              onKeyDown={(e) => e.key === "Enter" && check()}
            />
            <p className="text-xs mt-1" style={{ color: "var(--color-sidebar-text)" }}>
              Words: {exercise.words?.join(", ")}
            </p>
          </>
        );

      default:
        return (
          <>
            <p className="text-sm mb-2">{exercise.prompt || exercise.sentence || "Write your answer:"}</p>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="input-field"
              onKeyDown={(e) => e.key === "Enter" && check()}
            />
          </>
        );
    }
  };

  return (
    <div className="p-3 rounded-lg" style={{ border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium opacity-50">#{index + 1} • {exercise.type}</span>
        {result && (
          <span className="text-xs font-bold" style={{ color: result.correct ? "var(--color-success)" : "var(--color-error)" }}>
            {result.correct ? "✓" : "✗"}
          </span>
        )}
      </div>
      {renderExercise()}
      {!result && (
        <button onClick={check} disabled={!answer.trim()} className="btn-primary text-xs mt-2">
          Check
        </button>
      )}
      {result && (
        <div className="mt-2">
          <p className="text-xs" style={{ color: result.correct ? "var(--color-success)" : "var(--color-error)" }}>
            {result.feedback}
          </p>
          {!result.correct && (
            <p className="text-xs mt-1 opacity-70">Expected: {exercise.answer}</p>
          )}
        </div>
      )}
    </div>
  );
}
