"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Trash2, Plus, X, Bot, FileText, Users } from "lucide-react";

type AdminUser = {
  id: string; name: string; email: string; role: string;
  photoUrl?: string; isAiEnabled: boolean; isAdmin: boolean; createdAt: string;
};

type AdminLesson = {
  id: string; title: string; sourceFileName: string; createdAt: string;
  teacherName: string; teacherEmail: string; moduleCount: number;
  rawTextSize: number; hasRawText: boolean;
};

export default function AdminUsers() {
  const [tab, setTab] = useState<"users" | "pdfs">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const loadUsers = useCallback(async (q?: string) => {
    setLoading(true);
    try { setUsers(await api.getAdminUsers(q)); } finally { setLoading(false); }
  }, []);

  const loadLessons = useCallback(async () => {
    setLoading(true);
    try { setLessons(await api.getAdminLessons()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { if (tab === "pdfs") loadLessons(); }, [tab, loadLessons]);

  useEffect(() => {
    if (tab !== "users") return;
    const t = setTimeout(() => loadUsers(search || undefined), 300);
    return () => clearTimeout(t);
  }, [search, tab, loadUsers]);

  async function toggleAi(user: AdminUser) {
    setToggling(user.id);
    try {
      await api.setAiAccess(user.id, !user.isAiEnabled);
      setUsers((p) => p.map((u) => u.id === user.id ? { ...u, isAiEnabled: !u.isAiEnabled } : u));
    } finally { setToggling(null); }
  }

  async function deleteUser() {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      await api.deleteUser(confirmDelete.id);
      setUsers((p) => p.filter((u) => u.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally { setDeleting(null); }
  }

  async function clearRawText(lesson: AdminLesson) {
    setDeleting(lesson.id);
    try {
      await api.clearLessonRawText(lesson.id);
      setLessons((p) => p.map((l) => l.id === lesson.id ? { ...l, hasRawText: false, rawTextSize: 0 } : l));
    } finally { setDeleting(null); }
  }

  async function createAdmin() {
    setCreateError("");
    if (!createForm.name || !createForm.email || !createForm.password) {
      setCreateError("Preencha todos os campos."); return;
    }
    setCreating(true);
    try {
      await api.createAdminUser(createForm);
      setShowCreate(false);
      setCreateForm({ name: "", email: "", password: "" });
      loadUsers();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Erro ao criar admin.");
    } finally { setCreating(false); }
  }

  const aiCount = users.filter((u) => u.isAiEnabled).length;
  const pdfCount = lessons.filter((l) => l.hasRawText).length;
  const pdfBytes = lessons.reduce((s, l) => s + l.rawTextSize, 0);

  return (
    <div className="min-h-screen p-6 md:p-10" style={{ background: "var(--nm-bg-deep)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Painel Admin</h1>
          <p className="text-sm" style={{ color: "var(--nm-text-muted)" }}>Gerencie usuários e dados da plataforma</p>
        </div>
        {tab === "users" && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "var(--nm-purple)" }}>
            <Plus size={16} /> Criar Admin
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Usuários" value={users.length} icon={<Users size={20} />} />
        <StatCard label="IA ativa" value={aiCount} icon={<Bot size={20} />} accent />
        <StatCard label="PDFs com texto" value={pdfCount} icon={<FileText size={20} />} />
        <StatCard label="Texto armazenado" value={`${Math.round(pdfBytes / 1024)}KB`} icon={<FileText size={20} />} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--nm-bg-surface)" }}>
        {(["users", "pdfs"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t
              ? { background: "var(--nm-purple)", color: "white" }
              : { color: "var(--nm-text-muted)" }}>
            {t === "users" ? "Usuários" : "PDFs"}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <>
          <div className="relative mb-4">
            <input type="text" placeholder="Buscar por nome ou e-mail..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)", color: "var(--nm-text)" }} />
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)" }}>
            {loading ? <Spinner /> : users.length === 0 ? <Empty text="Nenhum usuário encontrado" /> : (
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--nm-border)" }}>
                    {["Usuário", "Função", "Cadastro", "Acesso IA", ""].map((h) => (
                      <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--nm-text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, i) => (
                    <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? "1px solid var(--nm-border)" : "none" }}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                            style={{ background: user.isAiEnabled ? "var(--nm-purple)" : "var(--nm-bg-deep)" }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--nm-text)" }}>
                              {user.name}
                              {user.isAdmin && <span className="ml-2 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>admin</span>}
                            </p>
                            <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={user.role === "teacher"
                            ? { background: "rgba(124,58,237,0.15)", color: "var(--nm-purple-light)" }
                            : { background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                          {user.role === "teacher" ? "Professor" : "Aluno"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs" style={{ color: "var(--nm-text-muted)" }}>
                        {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => toggleAi(user)} disabled={toggling === user.id}
                          className="relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none disabled:opacity-50"
                          style={{ background: user.isAiEnabled ? "var(--nm-purple)" : "var(--nm-bg-deep)", border: "1px solid var(--nm-border)" }}>
                          <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300"
                            style={{ left: user.isAiEnabled ? "calc(100% - 1.375rem)" : "0.125rem" }} />
                        </button>
                      </td>
                      <td className="px-5 py-4">
                        {!user.isAdmin && (
                          <button onClick={() => setConfirmDelete(user)}
                            className="p-2 rounded-lg opacity-40 hover:opacity-100 transition-opacity"
                            style={{ color: "#ef4444" }} title="Deletar usuário">
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* PDFs tab */}
      {tab === "pdfs" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)" }}>
          {loading ? <Spinner /> : lessons.length === 0 ? <Empty text="Nenhum material encontrado" /> : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--nm-border)" }}>
                  {["Material", "Professor", "Módulos", "Texto", ""].map((h) => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--nm-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson, i) => (
                  <tr key={lesson.id} style={{ borderBottom: i < lessons.length - 1 ? "1px solid var(--nm-border)" : "none" }}>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium" style={{ color: "var(--nm-text)" }}>{lesson.title}</p>
                      <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>{lesson.sourceFileName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm" style={{ color: "var(--nm-text)" }}>{lesson.teacherName}</p>
                      <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>{lesson.teacherEmail}</p>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: "var(--nm-text)" }}>{lesson.moduleCount}</td>
                    <td className="px-5 py-4">
                      {lesson.hasRawText
                        ? <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                            {Math.round(lesson.rawTextSize / 1024)}KB armazenado
                          </span>
                        : <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                            Limpo
                          </span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      {lesson.hasRawText && (
                        <button onClick={() => clearRawText(lesson)} disabled={deleting === lesson.id}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-opacity"
                          style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                          <Trash2 size={13} /> Apagar texto
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal: Confirm delete user */}
      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
              <Trash2 size={18} style={{ color: "#ef4444" }} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Deletar usuário</h3>
              <p className="text-xs" style={{ color: "var(--nm-text-muted)" }}>Esta ação não pode ser desfeita</p>
            </div>
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--nm-text-muted)" }}>
            Tem certeza que deseja deletar <span className="text-white font-medium">{confirmDelete.name}</span> ({confirmDelete.email})?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--nm-bg-deep)", color: "var(--nm-text-muted)" }}>
              Cancelar
            </button>
            <button onClick={deleteUser} disabled={!!deleting}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "#ef4444" }}>
              {deleting ? "Deletando..." : "Deletar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: Create admin */}
      {showCreate && (
        <Modal onClose={() => { setShowCreate(false); setCreateError(""); setCreateForm({ name: "", email: "", password: "" }); }}>
          <h3 className="font-semibold text-white mb-1">Criar Admin</h3>
          <p className="text-xs mb-5" style={{ color: "var(--nm-text-muted)" }}>O novo admin terá acesso total à plataforma e à IA</p>

          <div className="space-y-3">
            {(["name", "email", "password"] as const).map((field) => (
              <input key={field} type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                placeholder={field === "name" ? "Nome completo" : field === "email" ? "E-mail" : "Senha (mín. 6 caracteres)"}
                value={createForm[field]}
                onChange={(e) => setCreateForm((p) => ({ ...p, [field]: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: "var(--nm-bg-deep)", border: "1px solid var(--nm-border)", color: "var(--nm-text)" }} />
            ))}
          </div>

          {createError && <p className="text-xs mt-3" style={{ color: "#f87171" }}>{createError}</p>}

          <div className="flex gap-3 mt-5">
            <button onClick={() => { setShowCreate(false); setCreateError(""); }}
              className="flex-1 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--nm-bg-deep)", color: "var(--nm-text-muted)" }}>
              Cancelar
            </button>
            <button onClick={createAdmin} disabled={creating}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--nm-purple)" }}>
              {creating ? "Criando..." : "Criar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-2xl p-5" style={{
      background: accent ? "rgba(99,102,241,0.1)" : "var(--nm-bg-surface)",
      border: `1px solid ${accent ? "rgba(124,58,237,0.3)" : "var(--nm-border)"}`,
    }}>
      <div className="mb-2" style={{ color: accent ? "var(--nm-purple-light)" : "var(--nm-text-muted)" }}>{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs mt-1" style={{ color: "var(--nm-text-muted)" }}>{label}</div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 relative" style={{ background: "var(--nm-bg-surface)", border: "1px solid var(--nm-border)" }}
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 opacity-40 hover:opacity-100" style={{ color: "var(--nm-text-muted)" }}>
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--nm-purple)", borderTopColor: "transparent" }} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="py-16 text-center text-sm" style={{ color: "var(--nm-text-muted)" }}>{text}</div>;
}
