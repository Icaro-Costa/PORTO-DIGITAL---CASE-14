"use client";
import { useEffect, useRef, useState } from "react";
import { List, Minus, Plus, Search, MoreVertical, Send, Paperclip, Sparkles, Loader, FileText, MessageSquare } from "lucide-react";
import { useLessonStore } from "@/stores/lesson";
import { BACKEND_URL } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  quoted?: string;
}

export function PDFViewer() {
  const currentLesson = useLessonStore((s) => s.currentLesson);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [zoom] = useState(125);
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
            ? { ...m, content: "⚠️ Erro ao conectar com o mentor. Verifique ANTHROPIC_API_KEY em .env." }
            : m,
        ),
      );
    } finally {
      setStreaming(false);
    }
  }

  const snippet = currentLesson?.rawText?.slice(0, 1800) ?? "";

  return (
    <div className="flex flex-col h-full neuromentor" style={{ background: "var(--nm-bg-base)" }}>

      {/* Mobile tab bar */}
      <div className="flex md:hidden flex-shrink-0" style={{ borderBottom: "1px solid var(--nm-border)", background: "var(--nm-bg-surface)" }}>
        <button
          onClick={() => setMobileTab("material")}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
          style={{ color: mobileTab === "material" ? "var(--nm-purple-light)" : "var(--nm-text-muted)", borderBottom: mobileTab === "material" ? "2px solid var(--nm-purple)" : "2px solid transparent" }}
        >
          <FileText size={15} /> Material
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors"
          style={{ color: mobileTab === "chat" ? "var(--nm-purple-light)" : "var(--nm-text-muted)", borderBottom: mobileTab === "chat" ? "2px solid var(--nm-purple)" : "2px solid transparent" }}
        >
          <MessageSquare size={15} /> Chat
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
      <div
        className={`${mobileTab === "material" ? "flex" : "hidden"} md:flex flex-1 flex-col overflow-hidden`}
        style={{ borderRight: "1px solid var(--nm-border)" }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--nm-border)", background: "var(--nm-bg-surface)" }}
        >
          <button style={{ color: "var(--nm-text-muted)" }}>
            <List size={16} />
          </button>
          <div className="w-px h-4 mx-1" style={{ background: "var(--nm-border)" }} />
          <span className="text-xs truncate max-w-xs" style={{ color: "var(--nm-text-muted)" }}>
            {currentLesson?.title ?? "Nenhum material carregado"}
          </span>
          <div className="w-px h-4 mx-1" style={{ background: "var(--nm-border)" }} />
          <button style={{ color: "var(--nm-text-muted)" }}>
            <Minus size={14} />
          </button>
          <span className="text-xs text-white">{zoom}%</span>
          <button style={{ color: "var(--nm-text-muted)" }}>
            <Plus size={14} />
          </button>
          <div className="w-px h-4 mx-1" style={{ background: "var(--nm-border)" }} />
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2" style={{ color: "var(--nm-text-muted)" }} />
            <input
              placeholder="Buscar no documento..."
              className="pl-7 pr-3 py-1 rounded text-xs outline-none"
              style={{
                background: "var(--nm-bg-elevated)",
                border: "1px solid var(--nm-border)",
                color: "var(--nm-text)",
                width: 200,
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-2xl p-8 text-gray-800">
            {currentLesson ? (
              <>
                <h2 className="text-2xl font-bold mb-1 text-gray-900">{currentLesson.title}</h2>
                <hr className="mb-4" />
                <p className="text-xs text-gray-500 mb-4">
                  {currentLesson.rawText.length.toLocaleString()} caracteres extraídos
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">
                  {snippet}
                  {currentLesson.rawText.length > 1800 ? "…" : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                Nenhum material selecionado. Volte para <b>Upload</b> e envie um arquivo.
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        className={`${mobileTab === "chat" ? "flex" : "hidden"} md:flex w-full md:w-80 flex-shrink-0 flex-col`}
        style={{ background: "var(--nm-bg-surface)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--nm-border)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: "var(--nm-purple)" }}>
              <Sparkles size={12} color="white" />
            </div>
            <span className="font-semibold text-sm text-white">Assistente da Aula</span>
          </div>
          <button style={{ color: "var(--nm-text-muted)" }}>
            <MoreVertical size={14} />
          </button>
        </div>

        <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--nm-border)" }}>
          <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "var(--nm-text-muted)" }}>
            🤖 AÇÕES RÁPIDAS
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => send("Resuma este material em 5 tópicos.")}
              disabled={!currentLesson || streaming}
              className="px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "var(--nm-bg-elevated)", color: "var(--nm-text-muted)", border: "1px solid var(--nm-border)" }}
            >
              Resumir
            </button>
            <button
              onClick={() => send("Gere 5 questões de quiz baseadas neste conteúdo.")}
              disabled={!currentLesson || streaming}
              className="px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-40"
              style={{ background: "var(--nm-bg-elevated)", color: "var(--nm-text-muted)", border: "1px solid var(--nm-border)" }}
            >
              Gerar quiz
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-xs text-center py-8" style={{ color: "var(--nm-text-muted)" }}>
              Faça uma pergunta sobre o material carregado.
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              {msg.role === "user" ? (
                <div
                  className="max-w-[85%] rounded-xl p-3"
                  style={{ background: "var(--nm-bg-elevated)", border: "1px solid var(--nm-border)" }}
                >
                  <p className="text-sm text-white whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="max-w-[90%] flex gap-2">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "var(--nm-purple)" }}
                  >
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "var(--nm-bg-deep)", border: "1px solid var(--nm-border)" }}
                  >
                    <p className="text-xs font-semibold mb-2 text-white">Mentor</p>
                    <p className="text-xs leading-relaxed text-white whitespace-pre-line">
                      {msg.content || "..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid var(--nm-border)" }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "var(--nm-bg-elevated)", border: "1px solid var(--nm-border)" }}
          >
            <Paperclip size={14} style={{ color: "var(--nm-text-muted)", flexShrink: 0 }} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={streaming}
              placeholder={streaming ? "Mentor respondendo..." : "Pergunte algo sobre o material..."}
              className="flex-1 text-xs outline-none bg-transparent text-white placeholder-gray-500 disabled:opacity-50"
            />
            <button
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40"
              style={{ background: "var(--nm-purple)" }}
            >
              {streaming ? <Loader size={12} color="white" className="animate-spin" /> : <Send size={12} color="white" />}
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: "var(--nm-text-muted)" }}>
            IA pode errar. Verifique informações críticas.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
