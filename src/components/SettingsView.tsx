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
      setMessage(`Indexed: ${data.fileName} (${data.indexed} chunks at level ${uploadLevel})`);
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

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto pt-16 lg:pt-8 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-sidebar-text)" }}>
          API keys are managed via Vercel environment variables
        </p>
      </div>

      {/* API Keys Info */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">API Keys (Vercel Environment Variables)</h3>
        <p className="text-sm mb-4" style={{ color: "var(--color-sidebar-text)" }}>
          Set these in your Vercel dashboard under Project &rarr; Settings &rarr; Environment Variables.
          They are read from <code style={{ background: "var(--color-input)", padding: "1px 4px", borderRadius: "3px" }}>process.env</code> at runtime.
        </p>

        <div className="space-y-2">
          {[
            { key: "DEEPGRAM_API_KEY", desc: "Speech-to-text and text-to-speech (api.deepgram.com)" },
            { key: "DEEPSEEK_API_KEY", desc: "LLM for chat and content generation (api.deepseek.com)" },
            { key: "HUGGINGFACEHUB_API_TOKEN", desc: "Embeddings for RAG vector search (huggingface.co)" },
            { key: "DEEPGRAM_TTS_VOICE_PROFESSOR", desc: "TTS voice for the Professor role" },
            { key: "DEEPGRAM_TTS_VOICE_TUTOR", desc: "TTS voice for the Tutor role" },
            { key: "DEEPGRAM_TTS_VOICE_COMPANION_M", desc: "TTS voice for the Male Companion role" },
            { key: "DEEPGRAM_TTS_VOICE_COMPANION_F", desc: "TTS voice for the Female Companion role" },
          ].map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 px-3 rounded"
              style={{ background: "var(--color-input)" }}>
              <div>
                <code className="text-xs font-mono font-bold">{key}</code>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-sidebar-text)" }}>{desc}</p>
              </div>
              <a
                href={`https://vercel.com/cuzcomatthews-2409s-projects/eu-polytutor/settings/environment-variables`}
                target="_blank"
                className="btn-primary text-xs whitespace-nowrap"
              >
                Set in Vercel
              </a>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid var(--color-accent)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--color-accent)" }}>
            After setting environment variables in Vercel, the app will automatically redeploy with the new values.
          </p>
        </div>
      </div>

      {/* Database Status */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-1">Database</h3>
        <p className="text-xs" style={{ color: "var(--color-sidebar-text)" }}>
          DATABASE_URL is configured. Data is stored in Neon PostgreSQL with PGVector.
          <br />
          <a
            href="https://console.neon.tech"
            target="_blank"
            className="underline"
            style={{ color: "var(--color-accent)" }}
          >
            Open Neon Console
          </a>
        </p>
      </div>

      {/* Language Config */}
      <div className="card animate-slide-up">
        <h3 className="font-semibold mb-3">Language Configuration</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--color-sidebar-text)" }}>
              TARGET_LANGUAGE (environment variable)
            </label>
            <input
              type="text"
              value="de"
              disabled
              className="input-field opacity-50"
            />
            <p className="text-xs mt-1" style={{ color: "var(--color-sidebar-text)" }}>
              Change via Vercel env vars
            </p>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--color-sidebar-text)" }}>
              NATIVE_LANGUAGE (environment variable)
            </label>
            <input
              type="text"
              value="es"
              disabled
              className="input-field opacity-50"
            />
            <p className="text-xs mt-1" style={{ color: "var(--color-sidebar-text)" }}>
              Change via Vercel env vars
            </p>
          </div>
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
          <p className={`text-xs mb-3 p-2 rounded ${message.includes("failed") || message.includes("Failed") ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
            {message}
            <button onClick={() => setMessage("")} className="ml-2 font-bold">x</button>
          </p>
        )}

        <div className="max-h-60 overflow-y-auto space-y-1 mb-3">
          {ragDocs.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: "var(--color-sidebar-text)" }}>
              No documents indexed. Upload learning materials (PDF, TXT, MD) tagged with CEFR level.
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
