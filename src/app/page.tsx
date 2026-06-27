"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getAuthHeaders } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import DashboardView from "@/components/DashboardView";
import ChatView from "@/components/ChatView";
import DictionaryView from "@/components/DictionaryView";
import LessonsView from "@/components/LessonsView";
import SettingsView from "@/components/SettingsView";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userLevel, setUserLevel] = useState("A1.1");
  const [streakDays, setStreakDays] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [totalTurns, setTotalTurns] = useState(0);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/progress", { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.cefrLevel) setUserLevel(data.cefrLevel);
      if (data.streakDays !== undefined) setStreakDays(data.streakDays);
      if (data.totalWordsAdded !== undefined) setTotalWords(data.totalWordsAdded);
      if (data.totalTurns !== undefined) setTotalTurns(data.totalTurns);
    } catch {}
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) fetchProgress();
  }, [user, loading, router, fetchProgress]);

  const handleLevelChange = useCallback((newLevel: string) => {
    setUserLevel(newLevel);
  }, []);

  const handleProgressUpdate = useCallback(() => {
    fetchProgress();
  }, [fetchProgress]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSidebarOpen(false);
        }}
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userLevel={userLevel}
        streakDays={streakDays}
        totalWords={totalWords}
        totalTurns={totalTurns}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto">
        {activeTab === "dashboard" && (
          <DashboardView
            userLevel={userLevel}
            streakDays={streakDays}
            totalWords={totalWords}
            totalTurns={totalTurns}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === "chat" && (
          <ChatView
            userLevel={userLevel}
            onProgressUpdate={handleProgressUpdate}
          />
        )}
        {activeTab === "dictionary" && (
          <DictionaryView
            onProgressUpdate={handleProgressUpdate}
          />
        )}
        {activeTab === "lessons" && (
          <LessonsView
            userLevel={userLevel}
            onLevelChange={handleLevelChange}
            onProgressUpdate={handleProgressUpdate}
          />
        )}
        {activeTab === "settings" && (
          <SettingsView
            onProgressUpdate={handleProgressUpdate}
          />
        )}
      </main>
    </div>
  );
}
