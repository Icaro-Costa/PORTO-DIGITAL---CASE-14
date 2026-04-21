"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, X, Check, RotateCcw, AlertCircle, BookOpen, Merge } from "lucide-react";
import { useLessonStore, type LessonModule } from "@/stores/lesson";

type FilterKey = "all" | "pending" | "approved" | "rejected";

const STATUS_COLORS: Record<LessonModule["status"], { bg: string; text: string; label: string }> = {
  pending: { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "PENDENTE" },
  approved: { bg: "rgba(59,130,246,0.15)", text: "#3b82f6", label: "✓ APROVADO" },
  rejected: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", label: "REJEITADO" },
};

const BORDER_COLORS: Record<LessonModule["status"], string> = {
  pending: "var(--nm-border)",
  approved: "rgba(59,130,246,0.4)",
  rejected: "rgba(239,68,68,0.4)",
};

export function ReviewValidation() {
  const router = useRouter();
  const currentLesson = useLessonStore((s) => s.currentLesson);
  const setModuleStatus = useLessonStore((s) => s.setModuleStatus);
  const mergeModules = useLessonStore((s) => s.mergeModules);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [merging, setMerging] = useState(false);

  const modules = currentLesson?.modules ?? [];

  const counts = {
    all: modules.length,
    pending: modules.filter((m) => m.status === "pending").length,
    approved: modules.filter((m) => m.status === "approved").length,
    rejected: modules.filter((m) => m.status === "rejected").length,
  };

  const visible = filter === "all" ? modules : modules.filter((m) => m.status === filter);

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const bulkSetStatus = (status: LessonModule["status"]) => {
    selected.forEach((id) => setModuleStatus(id, status));
    setSelected([]);
  };

  const handleMerge = async () => {
    if (selected.length !== 2) return;
    setMerging(true);
    await mergeModules(selected[0], selected[1]);
    setMerging(false);
    setSelected([]);
  };

  const firstApproved = modules.find((m) => m.status === "approved");

  if (!currentLesson) {
    return (
      <div className="p-8 neuromentor">
        <div
          className="p-6 rounded-xl flex items-start gap-3"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-400">Nenhuma aula carregada</p>
            <p className="text-sm mt-1" style={{ color: "var(--nm-text-muted)" }}>
              Volte para o upload e envie um material.
            </p>
          </div>
          <button
            onClick={() => router.push("/lesson-builder/upload")}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--nm-purple)" }}
          >
            Ir para Upload
          </button>
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="p-8 neuromentor">
        <div
          className="p-6 rounded-xl flex items-start gap-3"
          style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)" }}
        >
          <BookOpen size={20} className="text-purple-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-white">Módulos não gerados ainda</p>
            <p className="text-sm mt-1" style={{ color: "var(--nm-text-muted)" }}>
              Execute o processamento antes de revisar.
            </p>
          </div>
          <button
            onClick={() => router.push("/lesson-builder/processing")}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "var(--nm-purple)" }}
          >
            Processar agora
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full neuromentor">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Revisão e Validação</h1>
            <p className="text-sm" style={{ color: "var(--nm-text-muted)" }}>
              Revise os módulos gerados pela IA e aprove para sua aula "{currentLesson.title}".
            </p>
          </div>

          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)" }}
          >
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={{
                  background: filter === f ? "var(--nm-bg-elevated)" : "transparent",
                  color: filter === f ? "white" : "var(--nm-text-muted)",
                }}
              >
                {f === "all" ? "Todos" : f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : "Rejeitados"} ({counts[f]})
              </button>
            ))}
          </div>
        </div>

        {selected.length > 0 && (
          <div
            className="flex items-center justify-between p-4 rounded-xl mb-6"
            style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)" }}
          >
            <span className="text-sm" style={{ color: "var(--nm-text-muted)" }}>
              {selected.length} selecionado(s)
            </span>
            <div className="flex gap-2">
              {selected.length === 2 && (
                <button
                  onClick={handleMerge}
                  disabled={merging}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
                  style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}
                >
                  <Merge size={14} /> {merging ? "Mesclando..." : "Mesclar"}
                </button>
              )}
              <button
                onClick={() => bulkSetStatus("rejected")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border"
                style={{ borderColor: "#ef4444", color: "#ef4444" }}
              >
                <X size={14} /> Rejeitar
              </button>
              <button
                onClick={() => bulkSetStatus("approved")}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{
                  background: "rgba(124,58,237,0.2)",
                  color: "var(--nm-purple-light)",
                  border: "1px solid rgba(124,58,237,0.3)",
                }}
              >
                <Check size={14} /> Aprovar
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          {visible.map((mod) => {
            const s = STATUS_COLORS[mod.status];
            return (
              <div
                key={mod.id}
                className="rounded-xl p-4 flex flex-col"
                style={{
                  background: "var(--nm-bg-surface)",
                  border: `1px solid ${BORDER_COLORS[mod.status]}`,
                  borderTop: `3px solid ${BORDER_COLORS[mod.status]}`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {mod.status === "pending" && (
                      <input
                        type="checkbox"
                        checked={selected.includes(mod.id)}
                        onChange={() => toggleSelect(mod.id)}
                        className="rounded accent-purple-600"
                      />
                    )}
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: s.bg, color: s.text }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#eab308" }}>
                    <Star size={10} fill="currentColor" /> {mod.match}%
                  </span>
                </div>

                <h3 className="font-bold text-white mb-2 text-sm">{mod.title}</h3>
                <p className="text-xs mb-3 flex-1" style={{ color: "var(--nm-text-muted)" }}>
                  {mod.summary}
                </p>

                {mod.concepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {mod.concepts.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--nm-bg-elevated)", color: "var(--nm-text-muted)" }}
                      >
                        {c}
                      </span>
                    ))}
                    {mod.concepts.length > 4 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--nm-bg-elevated)", color: "var(--nm-text-muted)" }}
                      >
                        +{mod.concepts.length - 4}
                      </span>
                    )}
                  </div>
                )}

                <div
                  className="flex items-center gap-2 pt-3"
                  style={{ borderTop: "1px solid var(--nm-border)" }}
                >
                  {mod.status === "pending" ? (
                    <>
                      <div className="flex-1" />
                      <button
                        onClick={() => setModuleStatus(mod.id, "rejected")}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10"
                      >
                        <X size={14} />
                      </button>
                      <button
                        onClick={() => setModuleStatus(mod.id, "approved")}
                        className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-400/10"
                      >
                        <Check size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          router.push(`/aula/${currentLesson.id}?module=${encodeURIComponent(mod.title)}`)
                        }
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "var(--nm-purple-light)" }}
                      >
                        <BookOpen size={12} /> Ver aula
                      </button>
                      <button
                        onClick={() => setModuleStatus(mod.id, "pending")}
                        className="flex items-center gap-1 text-xs ml-auto"
                        style={{ color: "var(--nm-text-muted)" }}
                      >
                        <RotateCcw size={12} /> Reverter
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ borderTop: "1px solid var(--nm-border)", background: "var(--nm-bg-surface)" }}
      >
        <div className="flex items-center gap-8">
          <div>
            <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>TOTAL</p>
            <p className="text-2xl font-bold text-white">{modules.length}</p>
          </div>
          <div className="w-px h-8" style={{ background: "var(--nm-border)" }} />
          <div>
            <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>APROVADOS</p>
            <p className="text-2xl font-bold" style={{ color: "var(--nm-purple-light)" }}>
              {counts.approved} / {modules.length}
            </p>
          </div>
          <div className="w-px h-8" style={{ background: "var(--nm-border)" }} />
          <div>
            <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>PENDENTES</p>
            <p className="text-2xl font-bold text-yellow-400">{counts.pending}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/lesson-builder/pdf-viewer")}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border"
            style={{ borderColor: "var(--nm-border)", color: "var(--nm-text)" }}
          >
            Chat com material
          </button>
          <button
            onClick={() =>
              firstApproved &&
              router.push(`/aula/${currentLesson.id}?module=${encodeURIComponent(firstApproved.title)}`)
            }
            disabled={!firstApproved}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--nm-purple)" }}
          >
            Iniciar Aula Simulada →
          </button>
        </div>
      </div>
    </div>
  );
}
