"use client";

import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "chat", label: "Conversations", icon: "💬" },
  { id: "dictionary", label: "Dictionary", icon: "📚" },
  { id: "lessons", label: "Lessons", icon: "📝" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  sidebarOpen: boolean;
  onToggle: () => void;
  userLevel: string;
  streakDays: number;
  totalWords: number;
  totalTurns: number;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  sidebarOpen,
  onToggle,
  userLevel,
  streakDays,
  totalWords,
  totalTurns,
}: SidebarProps) {
  const { user, logout } = useAuth();
  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ background: "var(--color-sidebar)" }}>
        <button onClick={onToggle} className="text-white p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <span className="text-white font-semibold text-sm">PolyTutor</span>
        <div className="w-8" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ background: "var(--color-sidebar)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
            style={{ background: "var(--color-accent)" }}>
            🎓
          </div>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">PolyTutor</h1>
            <p className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>
              AI Language Coach
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`sidebar-link w-full text-left ${activeTab === item.id ? "active" : ""}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Stats */}
        <div className="px-4 py-4 border-t space-y-2"
          style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>Level</span>
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded"
              style={{ background: "var(--color-accent)" }}>
              {userLevel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>Streak</span>
            <span className="text-xs text-white">{streakDays} 🔥</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>Words</span>
            <span className="text-xs text-white">{totalWords}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>Turns</span>
            <span className="text-xs text-white">{totalTurns}</span>
          </div>
          {user && (
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <span className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>{user.username}</span>
              <button onClick={logout} className="text-xs opacity-50 hover:opacity-100 text-white">Logout</button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
