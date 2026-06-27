"use client";

import React, { useState, useEffect, useCallback } from "react";

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
  const [exercises, setExercises] = useState<any>(null);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [exerciseResults, setExerciseResults] = useState<Record<number, any>>({});
  const [milestone, setMilestone] = useState<any>(null);
  const [milestoneResults, setMilestoneResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingSyllabus, setGeneratingSyllabus] = useState(false);

  const fetchSyllabus = useCallback(async () => {
    try {
      const res = await fetch("/api/syllabus");
      const data = await res.json();
      if (data.topics?.length) {
        setSyllabus(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchSyllabus();
  }, [fetchSyllabus]);

  const handleGenerateSyllabus = async () => {
    setGeneratingSyllabus(true);
    try {
      await fetch("/api/syllabus/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: userLevel }),
      });
      fetchSyllabus();
    } catch {}
    setGeneratingSyllabus(false);
  };

  const startLesson = async (topic: Topic) => {
    setActiveTopic(topic);
    setExercises(null);
    setExerciseResults({});
    setLoading(true);
    try {
      const res = await fetch("/api/lessons/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: topic.id,
          topicTitle: topic.title,
          topicDescription: topic.description,
          keyPoints: topic.keyPoints,
        }),
      });
      const data = await res.json();
      setExercises(data);
    } catch {}
    setLoading(false);
  };

  const checkExercise = async (index: number, userAnswer: string, expectedAnswer: string) => {
    try {
      const res = await fetch("/api/lessons/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userAnswer,
          expectedAnswer,
          exerciseType: exercises?.exercises?.[index]?.type || "write",
        }),
      });
      const data = await res.json();
      setExerciseResults((prev) => ({ ...prev, [index]: data }));
    } catch {}
  };

  const completedCount = Object.values(exerciseResults).filter((r: any) => r?.correct).length;
  const totalCount = exercises?.exercises?.length || 0;
  const topicPassed = totalCount > 0 && completedCount >= Math.ceil(totalCount * 0.6);

  const startMilestone = async () => {
    setMilestone(null);
    setMilestoneResults([]);
    setLoading(true);
    try {
      const completedTopics =
        syllabus?.topics
          ?.filter((t: any) => t.status === "completed")
          ?.map((t: any) => t.title) || [];

      const res = await fetch("/api/milestone/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: userLevel,
          completedTopics,
        }),
      });
      const data = await res.json();
      setMilestone(data);
    } catch {}
    setLoading(false);
  };

  const submitMilestone = async () => {
    const answers = milestone?.exercises?.map((ex: any, i: number) => ({
      userAnswer: milestoneResults[i] || "",
      expectedAnswer: ex.answer,
      exerciseType: ex.type,
    }));
    if (!answers?.length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/milestone/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        <p className="text-sm mt-1" style={{ color: "var(--color-sidebar-text)" }}>
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
                Take Milestone
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
                                   status === "in_progress" ? "var(--color-accent)" :
                                   "var(--color-border)",
                      background: activeTopic?.id === topic.id ? "rgba(99,102,241,0.05)" : "var(--color-card)",
                      opacity: status === "locked" ? 0.5 : 1,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                        ${status === "completed" ? "text-white" :
                          status === "in_progress" ? "text-white" :
                          "text-gray-500"}`}
                        style={{
                          background: status === "completed" ? "var(--color-success)" :
                                      status === "in_progress" ? "var(--color-accent)" :
                                      "var(--color-input)",
                        }}
                      >
                        {status === "completed" ? "✓" : status === "locked" ? "🔒" : i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{topic.title}</p>
                        <p className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>
                          {topic.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: "var(--color-sidebar-text)" }}>
              No syllabus generated yet for {userLevel}. Click "Generate Syllabus" to create one from your RAG content.
            </p>
          </div>
        )}
      </div>

      {/* Exercises */}
      {loading && (
        <div className="card text-center py-8 animate-fade-in">
          <div className="flex gap-1.5 justify-center">
            <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0s" }} />
            <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.15s" }} />
            <span className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.3s" }} />
          </div>
          <p className="text-sm mt-3" style={{ color: "var(--color-sidebar-text)" }}>Generating exercises...</p>
        </div>
      )}

      {exercises?.exercises && !loading && (
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              {activeTopic?.title}
            </h3>
            <button onClick={() => { setExercises(null); setActiveTopic(null); setExerciseResults({}); }} className="btn-ghost text-sm">
              Close
            </button>
          </div>

          <div className="space-y-4">
            {exercises.exercises.map((ex: any, i: number) => (
              <ExerciseCard
                key={i}
                exercise={ex}
                index={i}
                result={exerciseResults[i]}
                onCheck={(answer) => checkExercise(i, answer, ex.answer)}
              />
            ))}
          </div>

          {totalCount > 0 && (
            <div className="mt-4 p-3 rounded-lg text-center" style={{
              background: topicPassed ? "rgba(34,197,94,0.1)" : "var(--color-input)",
              border: `1px solid ${topicPassed ? "var(--color-success)" : "var(--color-border)"}`,
            }}>
              <p className="text-sm font-semibold">
                {topicPassed ? "Topic Passed!" : `${completedCount}/${totalCount} correct`}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-sidebar-text)" }}>
                {topicPassed ? "Great job! This topic is now complete." : "Need 60% to pass. Keep trying!"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Milestone */}
      {milestone?.exercises && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold mb-4">Milestone Evaluation - {userLevel}</h3>
          <div className="space-y-4">
            {milestone.exercises.map((ex: any, i: number) => (
              <ExerciseCard
                key={i}
                exercise={ex}
                index={i}
                result={milestoneResults[i]}
                onCheck={(answer) => {
                  setMilestoneResults((prev) => {
                    const next = [...prev];
                    next[i] = answer;
                    return next;
                  });
                }}
                inline
              />
            ))}
          </div>

          {milestoneResults.length === 0 ? (
            <input
              type="text"
              disabled
              placeholder="Fill all answers, then click Submit"
              className="input-field mt-4 opacity-50"
            />
          ) : null}

          {typeof milestoneResults[0] === "string" ? (
            <button
              onClick={submitMilestone}
              disabled={loading}
              className="btn-primary mt-4 w-full"
            >
              {loading ? "Evaluating..." : "Submit Milestone"}
            </button>
          ) : (
            milestoneResults.length > 0 && (
              <div className="mt-4 p-4 rounded-lg text-center" style={{
                background: milestoneResults.every((r: any) => r?.correct) ? "rgba(34,197,94,0.1)" : "var(--color-input)",
                border: `1px solid ${milestoneResults.every((r: any) => r?.correct) ? "var(--color-success)" : "var(--color-border)"}`,
              }}>
                <p className="font-bold">
                  {milestoneResults.filter((r: any) => r?.correct).length}/{milestoneResults.length} correct
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
  result,
  onCheck,
  inline,
}: {
  exercise: any;
  index: number;
  result: any;
  onCheck: (answer: string) => void;
  inline?: boolean;
}) {
  const [answer, setAnswer] = useState("");

  const handleCheck = () => {
    if (answer.trim()) onCheck(answer.trim());
  };

  return (
    <div className="p-3 rounded-lg" style={{ border: "1px solid var(--color-border)" }}>
      <span className="text-xs opacity-50">#{index + 1} • {exercise.type}</span>

      {exercise.type === "fill_blank" && (
        <>
          <p className="text-sm my-2">{exercise.prompt || exercise.sentence}</p>
          {exercise.options && !result && (
            <div className="flex flex-wrap gap-2 mb-2">
              {exercise.options.map((opt: string, j: number) => (
                <button
                  key={j}
                  onClick={() => inline ? onCheck(opt) : (setAnswer(opt), undefined)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    answer === opt ? "ring-2" : ""
                  }`}
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
      )}

      {exercise.type === "pick_translation" && (
        <>
          <p className="text-sm my-2">{exercise.prompt || `Translate: ${exercise.sentence}`}</p>
          {exercise.options && !result && (
            <div className="flex flex-wrap gap-2 mb-2">
              {exercise.options.map((opt: string, j: number) => (
                <button
                  key={j}
                  onClick={() => inline ? onCheck(opt) : (setAnswer(opt), undefined)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${answer === opt ? "ring-2" : ""}`}
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
      )}

      {exercise.type === "reorder" && (
        <>
          <p className="text-sm my-2">{exercise.prompt || "Put words in order:"}</p>
          {!result && (
            <>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type the correct sentence..."
                className="input-field"
                onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              />
              <p className="text-xs mt-1" style={{ color: "var(--color-sidebar-text)" }}>
                Words: {exercise.words?.join(", ")}
              </p>
            </>
          )}
        </>
      )}

      {exercise.type === "match_pairs" && (
        <MatchPairs
          exercise={exercise}
          result={result}
          onComplete={(matched) => {
            const formatted = exercise.pairs
              .map((p: any, i: number) => `${p.left}=${p.right}`)
              .join(", ");
            onCheck(formatted);
          }}
          inline={inline}
        />
      )}

      {!["fill_blank", "pick_translation", "reorder", "match_pairs"].includes(exercise.type) && (
        <>
          <p className="text-sm my-2">{exercise.prompt || exercise.sentence || "Write your answer:"}</p>
          {!result && (
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="input-field"
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            />
          )}
        </>
      )}

      {!result && !inline && (
        <button onClick={handleCheck} disabled={!answer.trim()} className="btn-primary text-xs mt-2">
          Check
        </button>
      )}

      {result && (
        <div className="mt-2 p-2 rounded" style={{
          background: result.correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        }}>
          <p className="text-xs font-medium" style={{
            color: result.correct ? "var(--color-success)" : "var(--color-error)",
          }}>
            {result.correct ? "✓ Correct" : "✗ Incorrect"} — {result.feedback}
          </p>
          {!result.correct && (
            <p className="text-xs mt-1 opacity-70">Expected: {exercise.answer}</p>
          )}
        </div>
      )}
    </div>
  );
}

function MatchPairs({
  exercise,
  result,
  onComplete,
  inline,
}: {
  exercise: any;
  result: any;
  onComplete: (matched: boolean) => void;
  inline?: boolean;
}) {
  const [shuffledRight] = useState(() => {
    const arr = exercise.pairs.map((_: any, i: number) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Record<number, boolean>>({});
  const [flashRight, setFlashRight] = useState<number | null>(null);
  const [wrongLeft, setWrongLeft] = useState<number | null>(null);

  const allMatched = Object.keys(matched).length === exercise.pairs.length;

  const handleLeftClick = (i: number) => {
    if (matched[i] || allMatched || result) return;
    setSelectedLeft(i);
    setFlashRight(null);
  };

  const handleRightClick = (shuffledIdx: number) => {
    if (selectedLeft === null || allMatched || result) return;
    const originalPairIndex = shuffledRight[shuffledIdx];

    if (matched[originalPairIndex]) return;

    if (selectedLeft === originalPairIndex) {
      setMatched((prev) => ({ ...prev, [selectedLeft]: true }));
      setSelectedLeft(null);
      if (Object.keys(matched).length + 1 === exercise.pairs.length) {
        setTimeout(() => onComplete(true), 300);
      }
    } else {
      setFlashRight(shuffledIdx);
      setWrongLeft(selectedLeft);
      setSelectedLeft(null);
      setTimeout(() => {
        setFlashRight(null);
        setWrongLeft(null);
      }, 600);
    }
  };

  return (
    <>
      <p className="text-sm my-2">{exercise.prompt || "Match the pairs:"}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div className="space-y-2">
          {exercise.pairs.map((pair: any, i: number) => (
            <button
              key={`left-${i}`}
              onClick={() => (inline ? undefined : handleLeftClick(i))}
              className={`text-sm p-2.5 rounded-lg text-center border transition-all duration-200 ${
                matched[i] ? "cursor-default" : "cursor-pointer hover:shadow-sm"
              }`}
              style={{
                background: matched[i]
                  ? "rgba(34,197,94,0.15)"
                  : selectedLeft === i
                  ? "rgba(99,102,241,0.15)"
                  : wrongLeft === i
                  ? "rgba(239,68,68,0.15)"
                  : "var(--color-input)",
                borderColor: matched[i]
                  ? "var(--color-success)"
                  : selectedLeft === i
                  ? "var(--color-accent)"
                  : wrongLeft === i
                  ? "var(--color-error)"
                  : "var(--color-border)",
                opacity: matched[i] ? 0.7 : 1,
              }}
            >
              <span className="font-medium" style={{
                color: matched[i] ? "var(--color-success)" : "inherit",
              }}>
                {matched[i] ? "✓ " : ""}
              </span>
              {pair.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {shuffledRight.map((origIdx: number, shuffledIdx: number) => (
            <button
              key={`right-${shuffledIdx}`}
              onClick={() => (inline ? undefined : handleRightClick(shuffledIdx))}
              className={`text-sm p-2.5 rounded-lg text-center border transition-all duration-200 ${
                matched[origIdx]
                  ? "cursor-default opacity-70"
                  : "cursor-pointer hover:shadow-sm"
              }`}
              style={{
                background: matched[origIdx]
                  ? "rgba(34,197,94,0.15)"
                  : flashRight === shuffledIdx
                  ? "rgba(239,68,68,0.2)"
                  : !matched[origIdx] && selectedLeft !== null
                  ? "rgba(99,102,241,0.05)"
                  : "var(--color-input)",
                borderColor: matched[origIdx]
                  ? "var(--color-success)"
                  : flashRight === shuffledIdx
                  ? "var(--color-error)"
                  : "var(--color-border)",
              }}
            >
              {exercise.pairs[origIdx].right}
            </button>
          ))}
        </div>
      </div>
      {allMatched && !result && (
        <p className="text-xs mt-2 text-center" style={{ color: "var(--color-success)" }}>
          All pairs matched!
        </p>
      )}
      {result && (
        <div className="mt-2 p-2 rounded" style={{
          background: result.correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        }}>
          <p className="text-xs font-medium" style={{
            color: result.correct ? "var(--color-success)" : "var(--color-error)",
          }}>
            {result.correct ? "✓ Correct" : "✗ Incorrect"} — {result.feedback}
          </p>
        </div>
      )}
    </>
  );
}


