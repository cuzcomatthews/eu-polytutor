"use client";

import { useState, useEffect } from "react";

interface Props {
  onProgressUpdate: () => void;
}

export default function SettingsView({ onProgressUpdate }: Props) {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLevel, setUploadLevel] = useState("A1");
  const [uploading, setUploading] = useState(false);
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setSettings).catch(() => {});
    fetch("/api/rag/upload").then((r) => r.json()).then((d) => setRagDocs(d.documents || [])).catch(() => {});
  }, []);

  const saveSetting = async (key: string, value: string) => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      setSettings((prev) => ({ ...prev, [key]: value }));
      onProgressUpdate();
    } catch {}
  };

  const uploadDocument = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("level", uploadLevel);

      const res = await fetch("/api/rag/upload", { method: "POST", body: formData });
      const data = await res.json();
      setMessage(`Uploaded: ${data.fileName} (${data.indexed} chunks at level ${uploadLevel})`);
      setUploadFile(null);

      const docsRes = await fetch("/api/rag/upload");
      const docsData = await docsRes.json();
      setRagDocs(docsData.documents || []);
    } catch (e) {
      setMessage("Upload failed");
    }
    setUploading(false);
  };

  const deleteRagDoc = async (id: string) => {
    await fetch(`/api/rag/documents/${id}`, { method: "DELETE" });
    setRagDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const resetRag = async () => {
    if (!confirm("Delete ALL RAG documents?")) return;
    await fetch("/api/rag/reindex", { method: "POST" });
    setRagDocs([]);
    setMessage("RAG reset complete");
  };

  const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const CEFR_LEVELS = ["A1.1", "A1.2", "A2.1", "A2.2", "B1.1", "B1.2", "B2.1", "B2.2", "C1", "C2"];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto pt-16 lg:pt-8 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-sidebar-text)" }}>
          Configure API keys, language, and RAG documents
        </p>
      </div>

      {/* API Keys */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-4">API Keys</h3>
        <div className="space-y-3">
          <ApiKeyInput
            label="Deepgram API Key"
            value={settings.DEEPGRAM_API_KEY || ""}
            onChange={(v) => saveSetting("DEEPGRAM_API_KEY", v)}
          />
          <ApiKeyInput
            label="Deepseek API Key"
            value={settings.DEEPSEEK_API_KEY || ""}
            onChange={(v) => saveSetting("DEEPSEEK_API_KEY", v)}
          />
          <ApiKeyInput
            label="HuggingFace API Token"
            value={settings.HUGGINGFACEHUB_API_TOKEN || ""}
            onChange={(v) => saveSetting("HUGGINGFACEHUB_API_TOKEN", v)}
          />
          <ApiKeyInput
            label="Professor TTS Voice ID"
            value={settings.DEEPGRAM_TTS_VOICE_PROFESSOR || ""}
            onChange={(v) => saveSetting("DEEPGRAM_TTS_VOICE_PROFESSOR", v)}
          />
          <ApiKeyInput
            label="Tutor TTS Voice ID"
            value={settings.DEEPGRAM_TTS_VOICE_TUTOR || ""}
            onChange={(v) => saveSetting("DEEPGRAM_TTS_VOICE_TUTOR", v)}
          />
          <ApiKeyInput
            label="Male Companion TTS Voice ID"
            value={settings.DEEPGRAM_TTS_VOICE_COMPANION_M || ""}
            onChange={(v) => saveSetting("DEEPGRAM_TTS_VOICE_COMPANION_M", v)}
          />
          <ApiKeyInput
            label="Female Companion TTS Voice ID"
            value={settings.DEEPGRAM_TTS_VOICE_COMPANION_F || ""}
            onChange={(v) => saveSetting("DEEPGRAM_TTS_VOICE_COMPANION_F", v)}
          />
        </div>
      </div>

      {/* Language */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">Language</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--color-sidebar-text)" }}>
              Target Language (learning)
            </label>
            <select
              value={settings.TARGET_LANGUAGE || "de"}
              onChange={(e) => saveSetting("TARGET_LANGUAGE", e.target.value)}
              className="input-field"
            >
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--color-sidebar-text)" }}>
              Native Language
            </label>
            <select
              value={settings.NATIVE_LANGUAGE || "es"}
              onChange={(e) => saveSetting("NATIVE_LANGUAGE", e.target.value)}
              className="input-field"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
            </select>
          </div>
        </div>
      </div>

      {/* Level Override */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">CEFR Level Override</h3>
        <div className="flex items-center gap-3">
          <select
            value={settings.CURRENT_CEFR_LEVEL || "A1.1"}
            onChange={(e) => saveSetting("CURRENT_CEFR_LEVEL", e.target.value)}
            className="input-field max-w-[150px]"
          >
            {CEFR_LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <span className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>
            Current: {settings.CURRENT_CEFR_LEVEL || "A1.1"}
          </span>
        </div>
      </div>

      {/* RAG Documents */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">RAG Knowledge Base</h3>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="file"
            accept=".txt,.md,.pdf"
            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            className="input-field"
          />
          <select
            value={uploadLevel}
            onChange={(e) => setUploadLevel(e.target.value)}
            className="input-field max-w-[120px]"
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            onClick={uploadDocument}
            disabled={!uploadFile || uploading}
            className="btn-primary text-sm whitespace-nowrap"
          >
            {uploading ? "Uploading..." : "Upload & Index"}
          </button>
        </div>

        {message && (
          <p className={`text-xs mb-3 p-2 rounded ${message.includes("failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
            {message}
            <button onClick={() => setMessage("")} className="ml-2 font-bold">✕</button>
          </p>
        )}

        <div className="max-h-60 overflow-y-auto space-y-1 mb-3">
          {ragDocs.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--color-sidebar-text)" }}>
              No documents indexed. Upload German learning materials (PDF, TXT, MD).
            </p>
          ) : (
            ragDocs.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-1.5 px-2 rounded text-xs"
                style={{ background: "var(--color-input)" }}>
                <div className="flex-1 truncate">
                  <span>{doc.metadata?.sourceFile || "Unknown"}</span>
                  <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{ background: "var(--color-accent)", color: "white" }}>
                    {doc.metadata?.level || "-"}
                  </span>
                </div>
                <button
                  onClick={() => deleteRagDoc(doc.id)}
                  className="ml-2 text-red-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        <button onClick={resetRag} className="btn-danger text-sm">
          Reset All RAG Data
        </button>
      </div>
    </div>
  );
}

function ApiKeyInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onChange(draft);
    setEditing(false);
  };

  return (
    <div>
      <label className="text-xs block mb-1" style={{ color: "var(--color-sidebar-text)" }}>
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type={show ? "text" : "password"}
          value={editing ? draft : value}
          onChange={(e) => { setDraft(e.target.value); setEditing(true); }}
          onBlur={save}
          placeholder={label}
          className="input-field flex-1 font-mono text-xs"
        />
        <button onClick={() => setShow(!show)} className="btn-ghost text-xs px-2">
          {show ? "Hide" : "Show"}
        </button>
        {editing && (
          <button onClick={save} className="btn-primary text-xs px-3">
            Save
          </button>
        )}
      </div>
    </div>
  );
}
