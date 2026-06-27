"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/context/AuthContext";

interface DashboardProps {
  userLevel: string;
  streakDays: number;
  totalWords: number;
  totalTurns: number;
  onNavigate: (tab: string) => void;
}

export default function DashboardView({
  userLevel,
  streakDays,
  totalWords,
  totalTurns,
  onNavigate,
}: DashboardProps) {
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [syllabus, setSyllabus] = useState<any>(null);

  useEffect(() => {
    fetch("/api/history", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setRecentActivity(d.activity || []))
      .catch(() => {});
    fetch("/api/syllabus", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => setSyllabus(d))
      .catch(() => {});
  }, []);

  const topicCount = syllabus?.topics?.length || 0;
  const completedCount = syllabus?.topics?.filter((t: any) => t.status === "completed").length || 0;
  const progressPct = topicCount > 0 ? Math.round((completedCount / topicCount) * 100) : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto pt-16 lg:pt-8 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-sidebar-text)" }}>
          Your learning journey at a glance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="card animate-slide-up text-center">
          <div className="text-3xl font-bold mb-1" style={{ color: "var(--color-accent)" }}>{userLevel}</div>
          <div className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>CEFR Level</div>
        </div>
        <div className="card animate-slide-up text-center" style={{ animationDelay: "0.05s" }}>
          <div className="text-3xl font-bold mb-1" style={{ color: "var(--color-warning)" }}>{streakDays} 🔥</div>
          <div className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>Day Streak</div>
        </div>
        <div className="card animate-slide-up text-center" style={{ animationDelay: "0.1s" }}>
          <div className="text-3xl font-bold mb-1" style={{ color: "var(--color-success)" }}>{totalWords}</div>
          <div className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>Words Saved</div>
        </div>
        <div className="card animate-slide-up text-center" style={{ animationDelay: "0.15s" }}>
          <div className="text-3xl font-bold mb-1" style={{ color: "var(--color-accent)" }}>{totalTurns}</div>
          <div className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>Total Turns</div>
        </div>
      </div>

      {/* Level Progress */}
      <div className="card animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <h3 className="font-semibold mb-3">Level Progress - {userLevel}</h3>
        <div className="w-full h-3 rounded-full overflow-hidden"
          style={{ background: "var(--color-input)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, var(--color-accent), var(--color-success))",
            }}
          />
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--color-sidebar-text)" }}>
          {completedCount} of {topicCount} topics completed ({progressPct}%)
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <button onClick={() => onNavigate("chat")} className="card text-left group cursor-pointer">
          <div className="text-2xl mb-2">💬</div>
          <h3 className="font-semibold text-sm mb-1">Start Chatting</h3>
          <p className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>
            Practice conversation with your AI tutor
          </p>
        </button>
        <button onClick={() => onNavigate("lessons")} className="card text-left group cursor-pointer">
          <div className="text-2xl mb-2">📝</div>
          <h3 className="font-semibold text-sm mb-1">Take Lessons</h3>
          <p className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>
            {completedCount > 0 ? "Continue your learning path" : "Start your first lesson"}
          </p>
        </button>
        <button onClick={() => onNavigate("dictionary")} className="card text-left group cursor-pointer">
          <div className="text-2xl mb-2">📚</div>
          <h3 className="font-semibold text-sm mb-1">Review Words</h3>
          <p className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>
            Practice your saved vocabulary
          </p>
        </button>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <div className="card animate-slide-up">
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentActivity.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b"
                style={{ borderColor: "var(--color-border)" }}>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>
                    {item.roleName} • {item.turnCount} turns
                  </p>
                </div>
                <span className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>
                  {new Date(item.lastActive).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
