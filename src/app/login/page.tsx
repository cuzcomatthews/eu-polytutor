"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, signup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isSignup) {
        await signup(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setUsername("demo");
    setPassword("learnnow");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--color-bg)" }}>
      <div className="w-full max-w-sm">
        <div className="card p-8 animate-fade-in">
          <h1 className="text-2xl font-bold text-center mb-1">PolyTutor</h1>
          <p className="text-sm text-center mb-6" style={{ color: "var(--color-sidebar-text)" }}>
            {isSignup ? "Create an account" : "Sign in to continue"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--color-sidebar-text)" }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="input-field mt-1"
                minLength={3}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium" style={{ color: "var(--color-sidebar-text)" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="input-field mt-1"
                minLength={4}
                required
              />
            </div>

            {error && (
              <p className="text-xs text-center p-2 rounded" style={{
                color: "var(--color-error)",
                background: "rgba(239,68,68,0.1)",
              }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? "..." : isSignup ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            <button
              onClick={() => { setIsSignup(!isSignup); setError(""); }}
              className="text-xs w-full text-center opacity-60 hover:opacity-100"
              style={{ color: "var(--color-accent)" }}
            >
              {isSignup ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
            <button
              onClick={fillDemo}
              className="text-xs w-full text-center opacity-40 hover:opacity-70"
              style={{ color: "var(--color-sidebar-text)" }}
            >
              Fill demo credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
