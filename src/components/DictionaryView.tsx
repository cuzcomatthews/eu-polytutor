"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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

const PAGE_SIZE = 20;

export default function DictionaryView({ onProgressUpdate }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [newWord, setNewWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchEntries = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/dictionary?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.pagination?.total || 0);
    } catch {}
  }, [search, page]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

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
      setPage(1);
      fetchEntries();
      onProgressUpdate();
    } catch {}
    setLoading(false);
  };

  const deleteWord = async (id: string) => {
    await fetch(`/api/dictionary/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    fetchEntries();
    onProgressUpdate();
  };

  const toggleFlip = (id: string) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startPractice = () => {
    const wordIds = entries.map((e) => e.id);
    if (!wordIds.length) return;
    const params = new URLSearchParams({
      topicId: "dictionary-practice",
      title: "Vocabulary Practice",
      desc: "Quick word review",
      keyPoints: JSON.stringify(wordIds),
    });
    router.push(`/lesson?${params.toString()}`);
  };

  const difficultyDot = (d: number) => {
    const colors = ["var(--owl-green)", "var(--owl-gold)", "var(--owl-red)", "#a560e8"];
    return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colors[Math.min(d - 1, 3)] || colors[0] }} />;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pt-16 lg:pt-8 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-extrabold">Dictionary</h2>
        <p className="text-sm mt-1 font-medium" style={{ color: "var(--sidebar-text)", opacity: 0.7 }}>
          {total} word{total !== 1 ? "s" : ""} collected
        </p>
      </div>

      {/* Add + Search */}
      <div className="space-y-3 animate-slide-up">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addWord()}
            placeholder="Add a new word..."
            className="input-field flex-1"
          />
          <button onClick={addWord} disabled={loading || !newWord.trim()} className="btn-primary">
            + Add
          </button>
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search..."
            className="input-field flex-1"
          />
          <button
            onClick={startPractice}
            disabled={entries.length === 0}
            className="btn-primary"
            style={{ background: "var(--owl-green)" }}
          >
            Practice All
          </button>
        </div>
      </div>

      {/* Cards grid */}
      {entries.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {entries.map((entry) => {
              const isFlipped = flipped.has(entry.id);
              return (
                <div key={entry.id} className="animate-slide-up">
                  <button
                    onClick={() => toggleFlip(entry.id)}
                    className="w-full aspect-[3/4] rounded-2xl relative transition-all duration-300 hover:scale-[1.03] active:scale-95 overflow-hidden"
                    style={{
                      background: "var(--card)",
                      border: "2px solid var(--border)",
                      borderBottomWidth: "4px",
                    }}
                  >
                    <div className="absolute top-2 left-2">
                      {difficultyDot(entry.difficulty)}
                    </div>

                    <div className="flex flex-col items-center justify-center h-full px-2 pb-6">
                      {isFlipped ? (
                        <>
                          <p className="text-sm font-bold text-center" style={{ color: "var(--owl-green)" }}>
                            {entry.translation}
                          </p>
                          {entry.exampleSentence && (
                            <p className="text-[10px] mt-2 text-center leading-tight opacity-50">
                              {entry.exampleSentence}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-base font-extrabold text-center">{entry.word}</p>
                          {entry.gender && (
                            <p className="text-[10px] mt-1 font-bold uppercase" style={{ color: "var(--accent)" }}>
                              {entry.gender}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteWord(entry.id)}
                    className="w-full text-[10px] font-bold py-1.5 mt-1 rounded-xl opacity-30 hover:opacity-100 transition-opacity"
                    style={{ color: "var(--error)" }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost text-sm px-4 py-2"
              >
                ←
              </button>
              <span className="text-sm font-bold">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-ghost text-sm px-4 py-2"
              >
                →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 animate-fade-in">
          <div className="text-5xl mb-3">📚</div>
          <p className="text-sm font-bold" style={{ color: "var(--sidebar-text)", opacity: 0.6 }}>
            No words yet. Add your first word above!
          </p>
        </div>
      )}
    </div>
  );
}
