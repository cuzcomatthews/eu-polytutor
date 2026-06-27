"use client";

import { useState, useEffect } from "react";

interface Props {
  onProgressUpdate: () => void;
}

export default function SettingsView({ onProgressUpdate }: Props) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLevel, setUploadLevel] = useState("A1");
  const [uploading, setUploading] = useState(false);
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/rag/upload").then((r) => r.json()).then((d) => setRagDocs(d.documents || [])).catch(() => {});
  }, []);

  const uploadDocument = async () => {
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("level", uploadLevel);

      const res = await fetch("/api/rag/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        setMessage(`Error: ${data.error}`);
      } else {
        setMessage(`Indexed: ${data.fileName} (${data.indexed} chunks, level ${uploadLevel})`);
      }

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

  const apiKeyNames = [
    { key: "DEEPGRAM_API_KEY", desc: "Speech-to-text and text-to-speech" },
    { key: "DEEPSEEK_API_KEY", desc: "LLM for chat and content generation" },
    { key: "HUGGINGFACEHUB_API_TOKEN", desc: "Embeddings for RAG vector search" },
    { key: "DEEPGRAM_TTS_VOICE_PROFESSOR", desc: "TTS voice for Professor role" },
    { key: "DEEPGRAM_TTS_VOICE_TUTOR", desc: "TTS voice for Tutor role" },
    { key: "DEEPGRAM_TTS_VOICE_COMPANION_M", desc: "TTS voice for Male Companion" },
    { key: "DEEPGRAM_TTS_VOICE_COMPANION_F", desc: "TTS voice for Female Companion" },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto pt-16 lg:pt-8 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-sidebar-text)" }}>
          Configure your environment and knowledge base
        </p>
      </div>

      {/* Environment Variables */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">Environment Variables</h3>
        <p className="text-sm mb-4" style={{ color: "var(--color-sidebar-text)" }}>
          Set these variables in your <code className="text-xs px-1 rounded" style={{ background: "var(--color-input)" }}>.env</code> file or your hosting platform environment variables.
          See <code className="text-xs px-1 rounded" style={{ background: "var(--color-input)" }}>.env.example</code> for the full list.
        </p>

        <div className="space-y-1">
          {apiKeyNames.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 px-3 rounded"
              style={{ background: "var(--color-input)" }}>
              <div>
                <code className="text-xs font-mono font-bold">{key}</code>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-sidebar-text)" }}>{desc}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                process.env.NODE_ENV === "production" ? "" : ""
              }`}>
                {key.includes("API_KEY") || key.includes("TOKEN") ? "••••••••" : "set in env"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid var(--color-accent)" }}>
          <p className="text-xs" style={{ color: "var(--color-accent)" }}>
            Copy <code>.env.example</code> to <code>.env</code>, fill in your API keys, and restart the app.
            All environment variables are read from <code>process.env</code> at runtime.
          </p>
        </div>
      </div>

      {/* RAG Documents */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">RAG Knowledge Base</h3>
        <p className="text-xs mb-3" style={{ color: "var(--color-sidebar-text)" }}>
          Upload learning materials (PDF, TXT, MD). Each document is chunked, embedded, and stored in PGVector for semantic search.
        </p>

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
          <p className={`text-xs mb-3 p-2 rounded ${
            message.includes("Error") || message.includes("Failed") || message.includes("failed")
              ? "bg-red-50 text-red-600"
              : "bg-green-50 text-green-600"
          }`}>
            {message}
            <button onClick={() => setMessage("")} className="ml-2 font-bold">x</button>
          </p>
        )}

        <div className="max-h-60 overflow-y-auto space-y-1 mb-3">
          {ragDocs.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--color-sidebar-text)" }}>
              No documents indexed yet.
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
                  x
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
