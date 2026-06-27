"use client";

import { useState, useEffect } from "react";
import { useAuth, getAuthHeaders } from "@/context/AuthContext";

interface Props {
  onProgressUpdate: () => void;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

const ROLE_VOICES = [
  { key: "professorVoice", label: "Professor", envKey: "DEEPGRAM_TTS_VOICE_PROFESSOR" },
  { key: "tutorVoice", label: "Tutor Guide", envKey: "DEEPGRAM_TTS_VOICE_TUTOR" },
  { key: "companionMVoice", label: "Male Companion", envKey: "DEEPGRAM_TTS_VOICE_COMPANION_M" },
  { key: "companionFVoice", label: "Female Companion", envKey: "DEEPGRAM_TTS_VOICE_COMPANION_F" },
];

export default function SettingsView({ onProgressUpdate }: Props) {
  const { user, logout } = useAuth();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLevel, setUploadLevel] = useState("A1");
  const [uploading, setUploading] = useState(false);
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [message, setMessage] = useState("");
  const [voices, setVoices] = useState<Record<string, string>>({});
  const [targetLanguage, setTargetLanguage] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/rag/upload", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setRagDocs(d.documents || []);
        setTotalChunks(d.totalChunks || 0);
      })
      .catch(() => {});

    fetch("/api/settings", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.voices) setVoices(d.voices);
        if (d.targetLanguage) setTargetLanguage(d.targetLanguage);
        if (d.nativeLanguage) setNativeLanguage(d.nativeLanguage);
      })
      .catch(() => {});
  }, []);

  const uploadDocument = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("level", uploadLevel);
      const res = await fetch("/api/rag/upload", { method: "POST", headers: getAuthHeaders(), body: formData });
      const data = await res.json();
      if (data.error) { setMessage(`Error: ${data.error}`); }
      else { setMessage(`${data.fileName} indexed (${data.indexed} chunks, ${uploadLevel})`); }
      setUploadFile(null);
      const dRes = await fetch("/api/rag/upload", { headers: getAuthHeaders() });
      const dData = await dRes.json();
      setRagDocs(dData.documents || []);
      setTotalChunks(dData.totalChunks || 0);
    } catch { setMessage("Upload failed"); }
    setUploading(false);
  };

  const deleteRagDoc = async (id: string) => {
    await fetch(`/api/rag/documents/${id}`, { method: "DELETE", headers: getAuthHeaders() });
    setRagDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const resetRag = async () => {
    if (!confirm("Delete ALL RAG documents?")) return;
    await fetch("/api/rag/reindex", { method: "POST", headers: getAuthHeaders() });
    setRagDocs([]);
    setTotalChunks(0);
    setMessage("RAG reset complete");
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ voices, targetLanguage, nativeLanguage }),
      });
      const data = await res.json();
      if (data.success) setMessage("Settings saved");
      else setMessage("Failed to save");
    } catch { setMessage("Failed to save"); }
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto pt-16 lg:pt-8 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-extrabold">Settings</h2>
        <p className="text-sm mt-1 font-medium" style={{ color: "var(--color-muted)" }}>
          Configure your environment and knowledge base
        </p>
      </div>

      {/* Profile + Logout */}
      {user && (
        <div className="card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Account</h3>
              <p className="text-sm font-medium" style={{ color: "var(--color-muted)" }}>{user.username}</p>
            </div>
            <button onClick={logout} className="btn-danger text-sm">Logout</button>
          </div>
        </div>
      )}

      {/* Language Settings */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">Language Configuration</h3>
        <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>
          Set which language to learn and your native language for explanations.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold">Target Language (ISO code)</label>
            <input
              type="text"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              placeholder="de, en, fr, ja..."
              className="input-field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-bold">Native Language (ISO code)</label>
            <input
              type="text"
              value={nativeLanguage}
              onChange={(e) => setNativeLanguage(e.target.value)}
              placeholder="es, en, pt..."
              className="input-field mt-1"
            />
          </div>
        </div>
        <button onClick={saveSettings} disabled={saving} className="btn-primary mt-4 text-sm">
          {saving ? "Saving..." : "Save Languages"}
        </button>
      </div>

      {/* TTS Voice Settings */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">TTS Voice Settings</h3>
        <p className="text-xs mb-4" style={{ color: "var(--color-muted)" }}>
          Set Deepgram Aura voice IDs for each role. Leave blank to use the environment default.
        </p>
        <div className="space-y-3">
          {ROLE_VOICES.map(({ key, label, envKey }) => (
            <div key={key}>
              <label className="text-xs font-bold">{label}</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={voices[key] || ""}
                  onChange={(e) => setVoices((v) => ({ ...v, [key]: e.target.value }))}
                  placeholder={key.endsWith("FVoice") ? "aura-2-lara-de" : "aura-2-julius-de"}
                  className="input-field"
                />
              </div>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                Env fallback: {key.endsWith("FVoice") ? "DEEPGRAM_TTS_VOICE_COMPANION_F" : key.endsWith("MVoice") ? "DEEPGRAM_TTS_VOICE_COMPANION_M" : key === "tutorVoice" ? "DEEPGRAM_TTS_VOICE_TUTOR" : "DEEPGRAM_TTS_VOICE_PROFESSOR"}
              </p>
            </div>
          ))}
        </div>
        <button onClick={saveSettings} disabled={saving} className="btn-primary mt-4 text-sm">
          {saving ? "Saving..." : "Save Voices"}
        </button>
      </div>

      {/* Environment Variables */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">Environment Variables</h3>
        <p className="text-sm mb-4" style={{ color: "var(--color-muted)" }}>
          Set these in your hosting platform or <code className="text-xs px-1 rounded" style={{ background: "var(--color-input)" }}>.env</code> file.
        </p>
        <div className="space-y-1">
          {[
            { key: "DEEPGRAM_API_KEY", desc: "Speech-to-text and text-to-speech" },
            { key: "DEEPSEEK_API_KEY", desc: "LLM for chat and content generation" },
            { key: "HUGGINGFACEHUB_API_TOKEN", desc: "Embeddings for RAG vector search" },
            { key: "TARGET_LANGUAGE", desc: "Language being taught (e.g. de, fr)" },
            { key: "NATIVE_LANGUAGE", desc: "User's native language (e.g. es, en)" },
          ].map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 px-3 rounded" style={{ background: "var(--color-input)" }}>
              <div>
                <code className="text-xs font-mono font-bold">{key}</code>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>{desc}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ color: "var(--color-muted)" }}>
                set in env
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* RAG Documents */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">RAG Knowledge Base</h3>
        <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>
          Upload learning materials (PDF, TXT, MD). Each document is chunked and embedded for semantic search.
          {totalChunks > 0 && ` — ${ragDocs.length} file${ragDocs.length !== 1 ? "s" : ""}, ${totalChunks} chunks`}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input type="file" accept=".txt,.md,.pdf" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} className="input-field" />
          <select value={uploadLevel} onChange={(e) => setUploadLevel(e.target.value)} className="input-field max-w-[120px]">
            {LEVELS.map((l) => (<option key={l} value={l}>{l}</option>))}
          </select>
          <button onClick={uploadDocument} disabled={!uploadFile || uploading} className="btn-primary text-sm whitespace-nowrap">
            {uploading ? "Uploading..." : "Upload & Index"}
          </button>
        </div>

        {message && (
          <p className="text-xs mb-3 p-2 rounded font-medium" style={{
            background: message.includes("Error") || message.includes("Failed") ? "rgba(255,75,75,0.1)" : "rgba(88,204,2,0.1)",
            color: message.includes("Error") || message.includes("Failed") ? "var(--error)" : "var(--success)",
          }}>
            {message}
          </p>
        )}

        <div className="max-h-60 overflow-y-auto space-y-1 mb-3">
          {ragDocs.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--color-muted)" }}>No documents indexed yet.</p>
          ) : (
            ragDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-1.5 px-2 rounded text-xs" style={{ background: "var(--color-input)" }}>
                <div className="flex-1 truncate">
                  <span className="font-medium">{doc.metadata?.sourceFile || "Unknown"}</span>
                  <span className="ml-2 opacity-50">({doc.chunkCount || 1} chunks)</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: "var(--accent)", color: "white" }}>
                    {doc.metadata?.level || "-"}
                  </span>
                </div>
                <button onClick={() => deleteRagDoc(doc.id)} className="ml-2 font-bold" style={{ color: "var(--error)" }}>x</button>
              </div>
            ))
          )}
        </div>

        <button onClick={resetRag} className="btn-danger text-sm">Reset All RAG Data</button>
      </div>
    </div>
  );
}
