"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAuthHeaders } from "@/context/AuthContext";

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Conversation {
  id: string;
  title: string;
  roleId: string;
  roleName: string;
  turnCount: number;
  updatedAt: string;
}

interface Message {
  id?: string;
  role: string;
  content: string;
  audioBase64?: string;
}

interface ChatViewProps {
  userLevel: string;
  onProgressUpdate: () => void;
}

export default function ChatView({ userLevel, onProgressUpdate }: ChatViewProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeRoleId, setActiveRoleId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionBubbleIdx, setSelectionBubbleIdx] = useState<number | null>(null);
  const [selectionPos, setSelectionPos] = useState<{ x: number; y: number } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/roles", { headers: getAuthHeaders() }).then((r) => r.json()).then((d) => {
      setRoles(d.roles || []);
      if (d.roles?.length && !activeRoleId) {
        setActiveRoleId(d.roles[0].id);
      }
    }).catch(() => {}).finally(() => setRolesLoading(false));
    fetchConversations();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations", { headers: getAuthHeaders() });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {}
  };

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.conversation) {
        setActiveConvId(convId);
        setActiveRoleId(data.conversation.role.id);
        setMessages(
          data.conversation.turns.map((t: any) => ({
            id: t.id,
            role: t.role,
            content: t.content,
          }))
        );
      }
    } catch {}
  };

  const createConversation = async () => {
    if (!activeRoleId) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: activeRoleId, title: `Chat with ${roles.find((r) => r.id === activeRoleId)?.name || "Tutor"}` }),
      });
      const data = await res.json();
      if (data.conversation) {
        setActiveConvId(data.conversation.id);
        setMessages([]);
        fetchConversations();
      }
    } catch {}
  };

  const deleteConversation = async (convId: string) => {
    try {
      await fetch(`/api/conversations/${convId}`, { method: "DELETE", headers: getAuthHeaders() });
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
      fetchConversations();
    } catch {}
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await sendAudio(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Mic access denied:", e);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const sendAudio = async (blob: Blob) => {
    if (!activeConvId || isProcessing) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("conversationId", activeConvId);
      formData.append("roleId", activeRoleId);

      const res = await fetch("/api/chat", { method: "POST", headers: getAuthHeaders(), body: formData });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        const newMsgs: Message[] = [
          { role: "user", content: data.transcription },
          { role: "assistant", content: data.responseText, audioBase64: data.audioBase64 },
        ];
        setMessages((prev) => [...prev, ...newMsgs]);
        setMetrics(data.metrics);

        if (data.audioBase64) {
          playAudio(data.audioBase64);
        }
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setIsProcessing(false);
      onProgressUpdate();
    }
  };

  const sendText = async () => {
    if (!textInput.trim() || !activeConvId || isProcessing) return;
    const text = textInput.trim();
    setTextInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsProcessing(true);

    try {
      const res = await fetch("/api/chat/text", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConvId, roleId: activeRoleId, text }),
      });
      const data = await res.json();

      if (!data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.responseText, audioBase64: data.audioBase64 }]);
        setMetrics(data.metrics);
        if (data.audioBase64) playAudio(data.audioBase64);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error." }]);
    } finally {
      setIsProcessing(false);
      onProgressUpdate();
    }
  };

  const playAudio = (base64: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(`data:audio/wav;base64,${base64}`);
    audioRef.current = audio;
    setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.play().catch(() => setIsPlaying(false));
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const handleTranslate = async (idx: number, text: string) => {
    if (translations[idx] || translatingIdx !== null) return;
    setTranslatingIdx(idx);
    try {
      const res = await fetch("/api/chat/translate", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.translation) {
        setTranslations((prev) => ({ ...prev, [idx]: data.translation }));
      }
    } catch {}
    setTranslatingIdx(null);
  };

  const handleAddToDictionary = async () => {
    if (!selectedText.trim()) return;
    try {
      await fetch("/api/dictionary", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ word: selectedText.trim() }),
      });
      setSelectedText("");
      setSelectionBubbleIdx(null);
      setSelectionPos(null);
    } catch {}
  };

  const handleMessageMouseUp = (i: number, e: React.MouseEvent) => {
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text && text.length > 1) {
        setSelectedText(text);
        setSelectionBubbleIdx(i);
        setSelectionPos({ x: e.clientX, y: e.clientY });
      } else {
        setSelectedText("");
        setSelectionBubbleIdx(null);
        setSelectionPos(null);
      }
    }, 10);
  };

  return (
    <div className="flex flex-col h-screen pt-14 lg:pt-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
        <div className="flex-1">
            <select
              value={activeRoleId}
              onChange={(e) => setActiveRoleId(e.target.value)}
              className="input-field max-w-[200px]"
              disabled={rolesLoading}
            >
              {rolesLoading ? (
                <option>Loading...</option>
              ) : roles.length === 0 ? (
                <option value="">No roles available</option>
              ) : (
                roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))
              )}
            </select>
        </div>
        <button onClick={createConversation} className="btn-primary text-sm" disabled={!activeRoleId}>
          + New Chat
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list (desktop sidebar) */}
        <div className="hidden md:flex w-56 flex-col border-r overflow-y-auto"
          style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => loadConversation(c.id)}
              className={`px-3 py-2.5 cursor-pointer border-b transition-colors ${activeConvId === c.id ? "bg-opacity-10" : ""}`}
              style={{
                borderColor: "var(--color-border)",
                background: activeConvId === c.id ? "rgba(99,102,241,0.08)" : "transparent",
              }}
            >
              <div className="text-sm font-medium truncate">{c.title}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                  {c.roleName} • {c.turnCount}t
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                  className="text-xs opacity-50 hover:opacity-100 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: "var(--color-muted)" }}>
              No conversations yet
            </p>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConvId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3 p-6">
                <div className="text-5xl">💬</div>
                <h3 className="text-lg font-semibold">Select or create a conversation</h3>
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  Choose a role above and start chatting
                </p>
                {/* Mobile conversation list */}
                <div className="md:hidden mt-4 space-y-2 max-h-60 overflow-y-auto">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => loadConversation(c.id)}
                      className="card w-full text-left"
                    >
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="text-xs" style={{ color: "var(--color-muted)" }}>
                        {c.roleName} • {c.turnCount} turns
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.role === "user"
                          ? "text-white"
                          : ""
                      }`}
                      style={{
                        background: msg.role === "user" ? "var(--color-accent)" : "var(--color-card)",
                        border: msg.role === "assistant" ? "1px solid var(--color-border)" : "none",
                      }}
                      onMouseUp={(e) => handleMessageMouseUp(i, e)}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {translations[i] && (
                        <div className="mt-2 pt-2 text-xs opacity-85 italic" style={{
                          borderTop: "1px solid var(--color-border)",
                          color: "var(--color-muted)",
                        }}>
                          <span className="font-semibold not-italic" style={{ color: "var(--color-accent)" }}>Translation: </span>
                          {translations[i]}
                        </div>
                      )}
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {msg.audioBase64 && (
                            <button
                              onClick={() => (isPlaying ? stopAudio() : playAudio(msg.audioBase64!))}
                              className="text-xs flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
                            >
                              {isPlaying ? "⏹ Stop" : "🔊 Play"}
                            </button>
                          )}
                          <button
                            onClick={() => handleTranslate(i, msg.content)}
                            disabled={translatingIdx === i || !!translations[i]}
                            className="text-xs flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                          >
                            {translatingIdx === i ? "🌐 ..." : translations[i] ? "🌐 Translated" : "🌐 Translate"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="rounded-2xl px-4 py-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0s" }} />
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.15s" }} />
                        <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: "var(--color-accent)", animationDelay: "0.3s" }} />
                      </div>
                    </div>
                  </div>
                )}
                {selectedText && selectionPos && (
                  <div
                    className="fixed z-50 animate-fade-in"
                    style={{
                      left: selectionPos.x + 10,
                      top: selectionPos.y - 40,
                    }}
                  >
                    <button
                      onClick={handleAddToDictionary}
                      className="px-3 py-1.5 text-xs rounded-lg shadow-lg border flex items-center gap-1.5 font-medium"
                      style={{
                        background: "var(--color-card)",
                        borderColor: "var(--color-border)",
                        color: "var(--color-accent)",
                      }}
                    >
                      📖 Add &quot;{selectedText.length > 25 ? selectedText.slice(0, 25) + "..." : selectedText}&quot; to Dictionary
                    </button>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 border-t" style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}>
                {/* Metrics */}
                {metrics && (
                  <div className="flex gap-3 text-xs mb-2 px-1" style={{ color: "var(--color-muted)" }}>
                    <span>STT: {metrics.sttMs}ms</span>
                    <span>RAG: {metrics.ragMs}ms</span>
                    <span>LLM: {metrics.llmMs}ms</span>
                    <span>TTS: {metrics.ttsMs}ms</span>
                    <span style={{ color: "var(--color-accent)" }}>Total: {metrics.totalMs}ms</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* Push-to-Talk Button */}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className="relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      background: isRecording ? "var(--color-error)" : "var(--color-accent)",
                      animation: isRecording ? "recordPulse 1.5s ease-in-out infinite" : "none",
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                      {isRecording ? (
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      ) : (
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                      )}
                    </svg>
                  </button>

                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendText()}
                    placeholder={isRecording ? "Recording..." : isProcessing ? "Processing..." : "Type or use mic..."}
                    disabled={isProcessing || isRecording}
                    className="input-field flex-1"
                  />
                  <button
                    onClick={sendText}
                    disabled={!textInput.trim() || isProcessing}
                    className="btn-primary text-sm flex-shrink-0"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
