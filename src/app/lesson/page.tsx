"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ExerciseRenderer } from "@/components/exercises/ExerciseRenderer";
import { getAuthHeaders } from "@/context/AuthContext";

type Phase = "loading" | "intro" | "playing" | "complete";

function LessonContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const topicId = searchParams.get("topicId") || "";
  const topicTitle = searchParams.get("title") || "";
  const topicDescription = searchParams.get("desc") || "";
  const keyPointsRaw = searchParams.get("keyPoints") || "[]";
  const keyPoints: string[] = (() => {
    try { return JSON.parse(keyPointsRaw); } catch { return []; }
  })();

  const [phase, setPhase] = useState<Phase>("loading");
  const [exercises, setExercises] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<Record<string, unknown> | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [results, setResults] = useState<Record<number, any>>({});
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!topicId) return;

    // Dictionary practice mode
    if (topicId === "dictionary-practice") {
      fetch("/api/dictionary/practice", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ wordIds: keyPoints }),
      })
        .then((r) => r.json())
        .then((d) => {
          setExercises(d);
          setPhase("playing");
        })
        .catch(() => setPhase("intro"));
      return;
    }

    fetch("/api/lessons/start", {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ topicId, topicTitle, topicDescription, keyPoints }),
    })
      .then((r) => r.json())
      .then((d) => {
        setExercises(d);
        setPhase(d.teaching_notes ? "intro" : "playing");
      })
      .catch(() => setPhase("intro"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const exerciseList = exercises?.exercises || [];
  const totalCount = exerciseList.length;
  const ex = exerciseList[idx];
  const isLast = idx === totalCount - 1;

  const completedCount = Object.values(results).filter((r: any) => r?.correct).length;
  const accuracy = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleCheck = async () => {
    if (!answer) return;
    setChecking(true);
    try {
      let userAnswer = "";
      let expectedAnswer = "";

      if (ex.kind === "multiple_choice") {
        const options = ex.payload.options as string[];
        const correctIdx = ex.payload.correct_index as number;
        userAnswer = options[answer.selected_index as number];
        expectedAnswer = options[correctIdx];
      } else if (ex.kind === "fill_blank" || ex.kind === "type_answer") {
        userAnswer = answer.text as string;
        expectedAnswer = (ex.payload.answers as string[])?.[0] || "";
      } else if (ex.kind === "match_pairs") {
        userAnswer = "all_matched";
        expectedAnswer = "";
      } else if (ex.kind === "ordering") {
        userAnswer = (answer.order as number[]).join(",");
        expectedAnswer = (ex.payload.correct_order as number[]).join(",");
      }

      const res = await fetch("/api/lessons/evaluate", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ userAnswer, expectedAnswer, exerciseType: ex.kind }),
      });
      const data = await res.json();
      setLastResult(data);
      setResults((prev) => ({ ...prev, [idx]: data }));
    } catch {}
    setChecking(false);
  };

  const handleNext = () => {
    setLastResult(null);
    setAnswer(null);
    if (isLast) {
      setPhase("complete");
      if (accuracy >= 60 && topicId && topicId !== "milestone") {
        fetch("/api/syllabus/complete", {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ topicId }),
        }).catch(() => {});
      }
    } else setIdx((i) => i + 1);
  };

  const goBack = () => router.back();

  // Loading
  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0s" }} />
          <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.15s" }} />
          <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.3s" }} />
        </div>
      </div>
    );
  }

  // Intro
  if (phase === "intro") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
        <div className="flex items-center px-4 py-3 border-b" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
          <button onClick={goBack} className="text-sm opacity-60 hover:opacity-100">← Back</button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card max-w-xl w-full text-center">
            <h1 className="text-2xl font-bold">{topicTitle}</h1>
            <p className="text-sm mt-1" style={{ color: "var(--color-sidebar-text)" }}>{topicDescription}</p>
            {exercises?.teaching_notes && (
              <div className="mt-4 p-4 rounded-xl text-sm text-left" style={{ background: "rgba(99,102,241,0.08)" }}>
                <p className="font-bold text-xs uppercase mb-1" style={{ color: "var(--color-accent)" }}>Mini-lesson</p>
                <p>{exercises.teaching_notes}</p>
              </div>
            )}
            <div className="mt-4 text-xs" style={{ color: "var(--color-sidebar-text)" }}>{totalCount} exercises</div>
            <button onClick={() => setPhase("playing")} className="btn-primary mt-4 w-full">Start</button>
          </div>
        </div>
      </div>
    );
  }

  // Complete
  if (phase === "complete") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="card max-w-xl w-full text-center">
            <div className="text-6xl">{accuracy >= 60 ? "🎉" : "💪"}</div>
            <h2 className="mt-2 text-xl font-bold" style={{ color: accuracy >= 60 ? "var(--color-success)" : "inherit" }}>
              Lesson Complete!
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border-2 p-3" style={{ borderColor: "var(--color-border)" }}>
                <p className="text-xs opacity-60">Accuracy</p>
                <p className="text-xl font-bold">{accuracy}%</p>
              </div>
              <div className="rounded-xl border-2 p-3" style={{ borderColor: "var(--color-border)" }}>
                <p className="text-xs opacity-60">Correct</p>
                <p className="text-xl font-bold">{completedCount}/{totalCount}</p>
              </div>
              <div className="rounded-xl border-2 p-3" style={{ borderColor: "var(--color-border)" }}>
                <p className="text-xs opacity-60">Result</p>
                <p className="text-xl font-bold" style={{ color: accuracy >= 60 ? "var(--color-success)" : "var(--color-error)" }}>
                  {accuracy >= 60 ? "Pass ✓" : "Retry ✗"}
                </p>
              </div>
            </div>
            <button onClick={goBack} className="btn-primary mt-4 w-full">Back to Syllabus</button>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
        <button onClick={goBack} className="text-sm opacity-60 hover:opacity-100">← Quit</button>
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-input)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((idx + (lastResult ? 1 : 0)) / totalCount) * 100}%`,
              background: "var(--color-accent)",
            }}
          />
        </div>
        <span className="text-xs opacity-60">{idx + 1}/{totalCount}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
          <div className="card min-h-[200px]">
            <p className="text-xs font-bold uppercase mb-1 opacity-50">Question {idx + 1} of {totalCount}</p>
            <h2 className="text-xl font-bold mb-4">{ex.prompt}</h2>
            <ExerciseRenderer
              key={ex.kind + "-" + idx}
              exercise={ex}
              onAnswerChange={setAnswer}
              disabled={!!lastResult}
            />
          </div>

          {lastResult && (
            <div className="flex items-start gap-3 rounded-2xl p-4 animate-fade-in"
              style={{ background: lastResult.correct ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)" }}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white text-sm"
                style={{ background: lastResult.correct ? "var(--color-success)" : "var(--color-error)" }}>
                {lastResult.correct ? "✓" : "✗"}
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: lastResult.correct ? "var(--color-success)" : "var(--color-error)" }}>
                  {lastResult.correct ? "Nice!" : "Not quite."}
                </p>
                {lastResult.feedback && <p className="text-sm mt-0.5 opacity-80">{lastResult.feedback}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 border-t flex justify-end" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
        {!lastResult ? (
          <button onClick={handleCheck} disabled={!answer || checking} className="btn-primary">
            {checking ? "Checking..." : "Check"}
          </button>
        ) : (
          <button onClick={handleNext} className="btn-primary">
            {isLast ? "Finish" : "Next"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0s" }} />
          <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.15s" }} />
          <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.3s" }} />
        </div>
      </div>
    }>
      <LessonContent />
    </Suspense>
  );
}
