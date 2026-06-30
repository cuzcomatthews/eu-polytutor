"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExerciseRenderer } from "@/components/exercises/ExerciseRenderer";
import { getAuthHeaders } from "@/context/AuthContext";

interface Topic {
  id: string;
  title: string;
  description: string;
  order: number;
  keyPoints: string[];
  status?: string;
}

interface Props {
  userLevel: string;
  onLevelChange: (level: string) => void;
  onProgressUpdate: () => void;
}

export default function LessonsView({ userLevel, onLevelChange, onProgressUpdate }: Props) {
  const [syllabus, setSyllabus] = useState<any>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [milestone, setMilestone] = useState<any>(null);
  const [milestoneResults, setMilestoneResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingSyllabus, setGeneratingSyllabus] = useState(false);
  const router = useRouter();

  const fetchSyllabus = useCallback(async () => {
    try {
      const res = await fetch("/api/syllabus", { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.topics?.length) setSyllabus(data);
    } catch {}
  }, []);

  useEffect(() => { fetchSyllabus(); }, [fetchSyllabus]);

  const handleGenerateSyllabus = async () => {
    setGeneratingSyllabus(true);
    try {
      await fetch("/api/syllabus/generate", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ level: userLevel }),
      });
      fetchSyllabus();
    } catch {}
    setGeneratingSyllabus(false);
  };

  const startLesson = (topic: Topic) => {
    const params = new URLSearchParams({
      topicId: topic.id,
      title: topic.title,
      desc: topic.description,
      keyPoints: JSON.stringify(topic.keyPoints),
    });
    router.push(`/lesson?${params.toString()}`);
  };

  const startMilestone = async () => {
    setMilestone(null);
    setMilestoneResults([]);
    setLoading(true);
    try {
      const completedTopics = syllabus?.topics
        ?.filter((t: any) => t.status === "completed")
        ?.map((t: any) => t.title) || [];
      const res = await fetch("/api/milestone/start", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ level: userLevel, completedTopics }),
      });
      const data = await res.json();
      setMilestone(data);
    } catch {}
    setLoading(false);
  };

  const submitMilestone = async () => {
    const answers = milestone?.exercises?.map((ex: any, i: number) => ({
      userAnswer: milestoneResults[i] || "",
      expectedAnswer: ex.payload?.answers?.[0] || ex.payload?.correct_index?.toString() || "",
      exerciseType: ex.kind,
    }));
    if (!answers?.length) return;
    setLoading(true);
    try {
      const res = await fetch("/api/milestone/answer", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      setMilestoneResults(data.results || []);
      if (data.levelAdvanced) {
        onLevelChange(data.level || "");
        fetchSyllabus();
      }
      onProgressUpdate();
    } catch {}
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto pt-16 lg:pt-8 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold">Lessons</h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          {userLevel} syllabus and exercises
        </p>
      </div>

      {/* Syllabus */}
      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Syllabus - {userLevel}</h3>
          <div className="flex gap-2">
            <button onClick={handleGenerateSyllabus} disabled={generatingSyllabus} className="btn-ghost text-sm">
              {generatingSyllabus ? "Generating..." : syllabus ? "Regenerate" : "Generate Syllabus"}
            </button>
            {syllabus?.topics?.length > 0 && (
              <button onClick={startMilestone} disabled={loading} className="btn-primary text-sm">
                Level Test
              </button>
            )}
          </div>
        </div>

        {syllabus?.topics ? (
          <div className="space-y-2">
            {syllabus.topics
              .sort((a: Topic, b: Topic) => a.order - b.order)
              .map((topic: Topic, i: number) => {
                const status = topic.status || (i === 0 ? "unlocked" : "locked");
                return (
                  <button
                    key={topic.id}
                    onClick={() => status !== "locked" && startLesson(topic)}
                    disabled={status === "locked"}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      activeTopic?.id === topic.id ? "ring-2" : ""
                    }`}
                    style={{
                      borderColor: status === "completed" ? "var(--color-success)" :
                                   status === "in_progress" ? "var(--color-accent)" : "var(--color-border)",
                      background: activeTopic?.id === topic.id ? "rgba(99,102,241,0.05)" : "var(--color-card)",
                      opacity: status === "locked" ? 0.5 : 1,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: status === "completed" ? "var(--color-success)" :
                                      status === "in_progress" ? "var(--color-accent)" : "var(--color-input)",
                          color: status === "completed" ? "white" : status === "in_progress" ? "white" : "inherit",
                        }}>
                        {status === "completed" ? "✓" : status === "locked" ? "🔒" : i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{topic.title}</p>
                        <p className="text-xs" style={{ color: "var(--color-muted)" }}>{topic.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              No syllabus generated yet for {userLevel}. Click "Generate Syllabus".
            </p>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="card text-center py-8 animate-fade-in">
          <div className="flex gap-1.5 justify-center">
            <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0s" }} />
            <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.15s" }} />
            <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.3s" }} />
          </div>
          <p className="text-sm mt-3" style={{ color: "var(--color-muted)" }}>Generating...</p>
        </div>
      )}

      {/* Milestone */}
      {milestone?.exercises && !loading && (
        <LessonOverlay
          topic={{ id: "milestone", title: `Milestone: ${userLevel}`, description: "Level evaluation", order: 0, keyPoints: [] }}
          exercises={milestone}
          isMilestone
          milestoneResults={milestoneResults}
          setMilestoneResults={setMilestoneResults}
          onSubmitMilestone={submitMilestone}
          onClose={() => setMilestone(null)}
          onProgress={onProgressUpdate}
        />
      )}
    </div>
  );
}

type Phase = "intro" | "playing" | "complete";

function LessonOverlay({
  topic,
  exercises,
  teachingNotes,
  isMilestone,
  milestoneResults,
  setMilestoneResults,
  onSubmitMilestone,
  onClose,
  onProgress,
}: {
  topic: Topic;
  exercises: any;
  teachingNotes?: string;
  isMilestone?: boolean;
  milestoneResults?: any[];
  setMilestoneResults?: (results: any[]) => void;
  onSubmitMilestone?: () => void;
  onClose: () => void;
  onProgress: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState<Record<string, unknown> | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [results, setResults] = useState<Record<number, any>>({});
  const [checking, setChecking] = useState(false);

  const exerciseList = exercises.exercises || [];
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
      onProgress();
    } else {
      setIdx((i) => i + 1);
    }
  };

  // Intro phase
  if (phase === "intro") {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div className="card max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <h2 className="text-xl font-bold">{topic.title}</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>{topic.description}</p>
          </div>

          {teachingNotes && (
            <div className="mt-4 p-4 rounded-xl text-sm" style={{ background: "rgba(99,102,241,0.08)" }}>
              <p className="font-bold text-xs uppercase mb-1" style={{ color: "var(--color-accent)" }}>Mini-lesson</p>
              <p>{teachingNotes}</p>
            </div>
          )}

          <div className="mt-4 text-xs text-center" style={{ color: "var(--color-muted)" }}>
            {totalCount} exercises
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1 text-sm">Back</button>
            <button onClick={() => setPhase("playing")} className="btn-primary flex-1 text-sm">
              {isMilestone ? "Start Evaluation" : "Start"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete phase
  if (phase === "complete") {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
        <div className="card max-w-xl w-full mx-4 text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="text-6xl">{accuracy >= 60 ? "🎉" : "💪"}</div>
          <h2 className="mt-2 text-xl font-bold" style={{ color: accuracy >= 60 ? "var(--color-success)" : "inherit" }}>
            {isMilestone ? "Evaluation Complete" : "Lesson Complete!"}
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

          <div className="mt-4 flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1 text-sm">Back to Syllabus</button>
            {isMilestone && accuracy >= 60 && onSubmitMilestone && (
              <button onClick={onSubmitMilestone} className="btn-primary flex-1 text-sm">Advance Level</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
        <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100">← Quit</button>
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

      {/* Exercise */}
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
            <div
              className="flex items-start gap-3 rounded-2xl p-4 animate-fade-in"
              style={{
                background: lastResult.correct ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              }}
            >
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

      {/* Bottom bar */}
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
