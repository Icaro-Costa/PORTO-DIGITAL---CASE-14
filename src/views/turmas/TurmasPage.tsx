"use client";
import { useState, useEffect } from "react";
import { Plus, Copy, Check, Users, BookOpen, Trash2, X, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { useClassStore } from "@/stores/class";
import { useLessonStore } from "@/stores/lesson";

export function TurmasPage() {
  const { classes, createClass, deleteClass, addLesson, removeLesson, loadTeacherClasses } = useClassStore();
  const lessons = useLessonStore((s) => s.lessons);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addingLesson, setAddingLesson] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTeacherClasses();
  }, [loadTeacherClasses]);

  const approvedLessons = lessons.filter((l) => l.modules.some((m) => m.status === "approved"));

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setCreateError(null);
    const result = await createClass(newName.trim());
    setSaving(false);
    if (!result.ok) { setCreateError(result.error ?? "Erro ao criar turma."); return; }
    setNewName("");
    setCreating(false);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    await deleteClass(confirmDelete);
    setDeleting(false);
    setConfirmDelete(null);
    if (expanded === confirmDelete) setExpanded(null);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const classToDelete = classes.find((c) => c.id === confirmDelete);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Minhas Turmas</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--nm-text-muted)" }}>
            Crie turmas e compartilhe o código com seus alunos.
          </p>
        </div>
        <button
          onClick={() => { setCreating(true); setCreateError(null); setNewName(""); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--nm-purple)" }}
        >
          <Plus size={15} /> Nova turma
        </button>
      </div>

      {/* Criar turma modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setCreating(false)}>
          <div className="w-full max-w-sm p-6 rounded-2xl" style={{ background: "var(--nm-bg-deep)", border: "1px solid var(--nm-border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">Nova turma</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--nm-text-muted)" }}>Um código único será gerado automaticamente.</p>
              </div>
              <button onClick={() => setCreating(false)} style={{ color: "var(--nm-text-muted)" }}><X size={16} /></button>
            </div>
            <label className="block text-xs font-medium text-white mb-1.5">Nome da turma</label>
            <input
              autoFocus
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setCreateError(null); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Ex: Física — 2º Ano B"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-purple-500 mb-3"
              style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)" }}
            />
            {createError && (
              <p className="text-xs text-red-400 mb-3 flex items-center gap-1">
                <AlertTriangle size={11} /> {createError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setCreating(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--nm-bg-elevated)", color: "var(--nm-text-muted)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "var(--nm-purple)" }}
              >
                {saving ? "Criando..." : "Criar turma"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmDelete && classToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-sm p-6 rounded-2xl" style={{ background: "var(--nm-bg-deep)", border: "1px solid rgba(239,68,68,0.3)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Excluir turma?</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--nm-text-muted)" }}>Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl mb-4" style={{ background: "var(--nm-bg-surface)" }}>
              <p className="text-sm font-semibold text-white">{classToDelete.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--nm-text-muted)" }}>
                {classToDelete.students.length} aluno{classToDelete.students.length !== 1 ? "s" : ""} · {classToDelete.lessons.length} aula{classToDelete.lessons.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--nm-bg-elevated)", color: "var(--nm-text-muted)" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: "#ef4444" }}
              >
                {deleting ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de turmas */}
      {classes.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--nm-text-muted)" }}>
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--nm-bg-surface)" }}>
            <Users size={28} className="opacity-40" />
          </div>
          <p className="text-sm font-medium text-white mb-1">Nenhuma turma criada ainda</p>
          <p className="text-xs">Clique em "Nova turma" para começar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => {
            const isExpanded = expanded === cls.id;
            const classLessonIds = cls.lessons.map((l) => l.id);
            const availableToAdd = approvedLessons.filter((l) => !classLessonIds.includes(l.id));

            return (
              <div key={cls.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)" }}>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : cls.id)}
                    className="flex-1 flex items-center gap-3 text-left min-w-0"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,58,237,0.15)" }}>
                      <Users size={15} style={{ color: "var(--nm-purple-light)" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{cls.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs" style={{ color: "var(--nm-text-muted)" }}>
                          {cls.students.length} aluno{cls.students.length !== 1 ? "s" : ""}
                        </span>
                        <span className="text-xs" style={{ color: "var(--nm-text-muted)" }}>·</span>
                        <span className="text-xs" style={{ color: "var(--nm-text-muted)" }}>
                          {cls.lessons.length} aula{cls.lessons.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronDown size={15} className="ml-auto flex-shrink-0" style={{ color: "var(--nm-text-muted)" }} />
                      : <ChevronRight size={15} className="ml-auto flex-shrink-0" style={{ color: "var(--nm-text-muted)" }} />}
                  </button>

                  {/* Código */}
                  <button
                    onClick={() => copyCode(cls.code)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg flex-shrink-0 transition-opacity hover:opacity-80"
                    style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}
                    title="Clique para copiar"
                  >
                    <span className="text-xs" style={{ color: "var(--nm-text-muted)" }}>Código</span>
                    <span className="text-sm font-bold tracking-widest" style={{ color: "var(--nm-purple-light)" }}>{cls.code}</span>
                    {copiedCode === cls.code
                      ? <Check size={12} className="text-green-400 flex-shrink-0" />
                      : <Copy size={12} className="flex-shrink-0" style={{ color: "var(--nm-text-muted)" }} />}
                  </button>

                  <button
                    onClick={() => setConfirmDelete(cls.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors flex-shrink-0"
                    style={{ color: "var(--nm-text-muted)" }}
                    title="Excluir turma"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Expandido */}
                {isExpanded && (
                  <div className="border-t px-5 py-5 space-y-6" style={{ borderColor: "var(--nm-border)" }}>
                    {/* Alunos */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold tracking-wider" style={{ color: "var(--nm-text-muted)" }}>
                          ALUNOS ({cls.students.length})
                        </p>
                      </div>
                      {cls.students.length === 0 ? (
                        <div className="p-4 rounded-xl text-center" style={{ background: "var(--nm-bg-elevated)", border: "1px dashed var(--nm-border)" }}>
                          <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>
                            Nenhum aluno inscrito ainda.
                          </p>
                          <p className="text-xs mt-1">
                            Compartilhe o código{" "}
                            <span className="font-bold" style={{ color: "var(--nm-purple-light)" }}>{cls.code}</span>
                            {" "}com seus alunos.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cls.students.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "var(--nm-bg-elevated)" }}>
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white font-medium truncate">{s.name}</p>
                                <p className="text-xs truncate" style={{ color: "var(--nm-text-muted)" }}>{s.email}</p>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                                Ativo
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Aulas */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold tracking-wider" style={{ color: "var(--nm-text-muted)" }}>
                          AULAS ({cls.lessons.length})
                        </p>
                        {availableToAdd.length > 0 && (
                          <button
                            onClick={() => setAddingLesson(addingLesson === cls.id ? null : cls.id)}
                            className="text-xs flex items-center gap-1 px-2 py-1 rounded-lg"
                            style={{ background: "rgba(124,58,237,0.1)", color: "var(--nm-purple-light)" }}
                          >
                            <Plus size={11} /> Adicionar aula
                          </button>
                        )}
                      </div>

                      {addingLesson === cls.id && (
                        <div className="mb-3 p-3 rounded-xl space-y-1" style={{ background: "var(--nm-bg-elevated)", border: "1px solid var(--nm-border)" }}>
                          <p className="text-xs font-medium text-white mb-2">Selecione uma aula para adicionar:</p>
                          {availableToAdd.map((l) => (
                            <button
                              key={l.id}
                              onClick={() => { addLesson(cls.id, { id: l.id, title: l.title }); setAddingLesson(null); }}
                              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-left transition-opacity hover:opacity-80"
                              style={{ background: "var(--nm-bg-surface)" }}
                            >
                              <BookOpen size={13} style={{ color: "var(--nm-purple-light)" }} />
                              <span className="text-white">{l.title}</span>
                              <span className="ml-auto text-xs" style={{ color: "var(--nm-text-muted)" }}>
                                {l.modules.filter((m) => m.status === "approved").length} módulos
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {cls.lessons.length === 0 ? (
                        <div className="p-4 rounded-xl text-center" style={{ background: "var(--nm-bg-elevated)", border: "1px dashed var(--nm-border)" }}>
                          <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>
                            {approvedLessons.length === 0
                              ? "Aprove ao menos um módulo de uma aula antes de adicioná-la."
                              : "Nenhuma aula adicionada. Clique em \"Adicionar aula\"."}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {cls.lessons.map((l) => (
                            <div key={l.id} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "var(--nm-bg-elevated)" }}>
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(124,58,237,0.15)" }}>
                                <BookOpen size={13} style={{ color: "var(--nm-purple-light)" }} />
                              </div>
                              <span className="flex-1 text-sm text-white truncate">{l.title}</span>
                              <button
                                onClick={() => removeLesson(cls.id, l.id)}
                                className="p-1 rounded hover:bg-red-500/10 transition-colors flex-shrink-0"
                                style={{ color: "var(--nm-text-muted)" }}
                                title="Remover aula"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
