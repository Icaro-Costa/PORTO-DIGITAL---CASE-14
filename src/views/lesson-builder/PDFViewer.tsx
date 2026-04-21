"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, MessageSquare, Send, Sparkles, Loader, ChevronDown, RotateCcw } from "lucide-react";
import { useLessonStore } from "@/stores/lesson";
import { BACKEND_URL } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function PDFViewer() {
  const currentLesson = useLessonStore((s) => s.currentLesson);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [mobileTab, setMobileTab] = useState<"material" | "chat">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);

    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      const raw = localStorage.getItem("neuromentor-auth");
      const token = raw ? (JSON.parse(raw)?.state?.token ?? null) : null;

      const res = await fetch(`${BACKEND_URL}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages: history, context: currentLesson?.rawText?.slice(0, 8000) ?? null }),
      });
      if (!res.ok || !res.body) throw new Error("Falha no chat");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("0:")) continue;
          try {
            const piece = JSON.parse(line.slice(2));
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + piece } : m)),
            );
          } catch {}
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "⚠️ Erro ao conectar com o mentor." }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  const QUICK_ACTIONS = [
    { label: "Resumir", prompt: "Resuma este material em 5 tópicos principais." },
    { label: "Pontos-chave", prompt: "Quais são os pontos mais importantes deste material?" },
    { label: "Gerar quiz", prompt: "Crie 5 questões de múltipla escolha sobre este conteúdo." },
  ];

  const previewText = currentLesson?.rawText ?? "";
  const PREVIEW_LIMIT = 2500;

  return (
    <div className="flex flex-col h-full neuromentor" style={{ background: "var(--nm-bg-base)" }}>

      {/* Mobile tab bar */}
      <div className="flex md:hidden flex-shrink-0" style={{ borderBottom: "1px solid var(--nm-border)", background: "var(--nm-bg-surface)" }}>
        <button
          onClick={() => setMobileTab("material")}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
          style={{
            color: mobileTab === "material" ? "var(--nm-purple-light)" : "var(--nm-text-muted)",
            borderBottom: mobileTab === "material" ? "2px solid var(--nm-purple)" : "2px solid transparent",
          }}
        >
          <FileText size={15} /> Material
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium"
          style={{
            color: mobileTab === "chat" ? "var(--nm-purple-light)" : "var(--nm-text-muted)",
            borderBottom: mobileTab === "chat" ? "2px solid var(--nm-purple)" : "2px solid transparent",
          }}
        >
          <MessageSquare size={15} /> Chat
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Material Viewer ── */}
        <div
          className={`${mobileTab === "material" ? "flex" : "hidden"} md:flex flex-1 flex-col overflow-hidden`}
          style={{ borderRight: "1px solid var(--nm-border)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ background: "var(--nm-bg-surface)", borderBottom: "1px solid var(--nm-border)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(124,58,237,0.15)" }}>
              <FileText size={18} style={{ color: "var(--nm-purple-light)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {currentLesson?.sourceFileName ?? currentLesson?.title ?? "Nenhum material"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--nm-text-muted)" }}>
                {currentLesson
                  ? `${currentLesson.rawText.length.toLocaleString()} caracteres · ${currentLesson.modules.length} módulos`
                  : "Sem arquivo carregado"}
              </p>
            </div>
          </div>

          {/* Text content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {currentLesson ? (
              <div className="max-w-2xl mx-auto">
                <div
                  className="rounded-2xl p-6"
                  style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)" }}
                >
                  <h2 className="text-base font-bold text-white mb-1">{currentLesson.title}</h2>
                  <p className="text-xs mb-5" style={{ color: "var(--nm-text-muted)" }}>
                    Arquivo: {currentLesson.sourceFileName}
                  </p>
                  <div className="h-px mb-5" style={{ background: "var(--nm-border)" }} />
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--nm-text)" }}>
                    {showFull ? previewText : previewText.slice(0, PREVIEW_LIMIT)}
                    {!showFull && previewText.length > PREVIEW_LIMIT && "…"}
                  </p>
                  {previewText.length > PREVIEW_LIMIT && (
                    <button
                      onClick={() => setShowFull(!showFull)}
                      className="mt-5 flex items-center gap-1 text-xs font-medium"
                      style={{ color: "var(--nm-purple-light)" }}
                    >
                      {showFull ? "Ver menos" : "Ver texto completo"}
                      <ChevronDown size={13} style={{ transform: showFull ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "var(--nm-bg-surface)" }}>
                  <FileText size={28} style={{ color: "var(--nm-text-muted)", opacity: 0.5 }} />
                </div>
                <p className="text-sm font-medium text-white mb-1">Nenhum material carregado</p>
                <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>
                  Volte para Upload e envie um arquivo.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Chat Panel ── */}
        <div
          className={`${mobileTab === "chat" ? "flex" : "hidden"} md:flex w-full md:w-96 flex-shrink-0 flex-col`}
          style={{ background: "var(--nm-bg-surface)" }}
        >
          {/* Chat header */}
          <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderBottom: "1px solid var(--nm-border)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--nm-purple)" }}>
              <Sparkles size={15} color="white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Assistente</p>
              <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>Pergunte sobre o material</p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="ml-auto p-1.5 rounded-lg"
                style={{ color: "var(--nm-text-muted)" }}
                title="Limpar conversa"
              >
                <RotateCcw size={13} />
              </button>
            )}
          </div>

          {/* Quick actions */}
          {messages.length === 0 && (
            <div className="px-4 pt-4 pb-2 flex-shrink-0 space-y-3">
              <p className="text-xs font-semibold px-1" style={{ color: "var(--nm-text-muted)" }}>AÇÕES RÁPIDAS</p>
              <div className="space-y-2">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => send(a.prompt)}
                    disabled={!currentLesson || streaming}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: "var(--nm-bg-elevated)", border: "1px solid var(--nm-border)", color: "var(--nm-text)" }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: "var(--nm-text-muted)" }}>
                Selecione uma ação ou faça uma pergunta.
              </p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "user" ? (
                  <div className="max-w-[80%] rounded-2xl px-4 py-3"
                    style={{ background: "var(--nm-bg-elevated)", border: "1px solid var(--nm-border)" }}>
                    <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <div className="max-w-[90%] flex gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: "var(--nm-purple)" }}>
                      <Sparkles size={13} color="white" />
                    </div>
                    <div className="rounded-2xl px-4 py-3 flex-1"
                      style={{ background: "var(--nm-bg-deep)", border: "1px solid var(--nm-border)" }}>
                      <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--nm-purple-light)" }}>Mentor</p>
                      <p className="text-sm leading-relaxed text-white whitespace-pre-line">
                        {msg.content || <span className="opacity-50">...</span>}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-4 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--nm-border)" }}>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: "var(--nm-bg-elevated)", border: "1px solid var(--nm-border)" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                disabled={streaming}
                placeholder={streaming ? "Mentor respondendo..." : "Pergunte sobre o material..."}
                className="flex-1 text-sm outline-none bg-transparent text-white placeholder-gray-500 disabled:opacity-50"
              />
              <button
                onClick={() => send()}
                disabled={streaming || !input.trim()}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                style={{ background: "var(--nm-purple)" }}
              >
                {streaming
                  ? <Loader size={13} color="white" className="animate-spin" />
                  : <Send size={13} color="white" />}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
