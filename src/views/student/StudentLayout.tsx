"use client";
import { useEffect, useState, useRef, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home, BookOpen, Dumbbell, Sparkles, BarChart2,
  Trophy, MessageSquare, LogOut, Menu, X,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useLessonStore } from "@/stores/lesson";
import { useProgressStore } from "@/stores/progress";
import { useClassStore } from "@/stores/class";

export function StudentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentLesson = useLessonStore((s) => s.currentLesson);
  const { level, syncFromServer } = useProgressStore();
  const loadStudentLessons = useLessonStore((s) => s.loadStudentLessons);
  const loadStudentClasses = useClassStore((s) => s.loadStudentClasses);
  const [open, setOpen] = useState(false);
  const touchStartX = useRef(0);

  useEffect(() => {
    if (!user) { router.replace("/login"); return; }
    if (user.role === "teacher") { router.replace("/lesson-builder/upload"); return; }
    loadStudentClasses();
    loadStudentLessons();
    syncFromServer();
  }, [user, router, loadStudentClasses, loadStudentLessons, syncFromServer]);

  // Close sidebar on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  if (!user || user.role === "teacher") return null;

  const userInitial = user.name.charAt(0).toUpperCase();
  const approvedModule = currentLesson?.modules.find((m) => m.status === "approved");

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/chat", label: "Chat IA", icon: MessageSquare },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/conquistas", label: "Conquistas", icon: Trophy },
  ];

  const lessonNav = currentLesson && approvedModule
    ? [
        { href: `/aula/${currentLesson.id}?module=${encodeURIComponent(approvedModule.title)}`, label: "Aula Simulada", icon: BookOpen },
        { href: `/exercicios/${currentLesson.id}?module=${encodeURIComponent(approvedModule.title)}`, label: "Exercícios", icon: Dumbbell },
        { href: `/revisao/${currentLesson.id}`, label: "Revisão Guiada", icon: Sparkles },
      ]
    : [];

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--nm-purple)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>
          <span className="font-semibold text-sm text-white">NeuroMentor</span>
        </div>
        <button className="md:hidden p-1 rounded-lg" style={{ color: "var(--nm-text-muted)" }} onClick={() => setOpen(false)}>
          <X size={18} />
        </button>
      </div>

      <p className="text-xs font-semibold px-3 mb-3 tracking-wider" style={{ color: "var(--nm-text-muted)" }}>MENU</p>
      <nav className="space-y-1 mb-4">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: active ? "rgba(124,58,237,0.2)" : "transparent", color: active ? "var(--nm-purple-light)" : "var(--nm-text-muted)" }}
            >
              <item.icon size={16} /> {item.label}
            </Link>
          );
        })}
      </nav>

      {lessonNav.length > 0 && (
        <>
          <p className="text-xs font-semibold px-3 mb-3 tracking-wider" style={{ color: "var(--nm-text-muted)" }}>APRENDER</p>
          <nav className="space-y-1 flex-1">
            {lessonNav.map((item) => {
              const active = pathname === item.href.split("?")[0];
              return (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: active ? "rgba(124,58,237,0.2)" : "transparent", color: active ? "var(--nm-purple-light)" : "var(--nm-text-muted)" }}
                >
                  <item.icon size={16} /> {item.label}
                </Link>
              );
            })}
          </nav>
        </>
      )}
      {lessonNav.length === 0 && <div className="flex-1" />}

      <div className="flex items-center gap-2 px-3 pt-4 border-t" style={{ borderColor: "var(--nm-border)" }}>
        <Link href="/perfil" className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 hover:opacity-80 transition-opacity">
          {userInitial}
        </Link>
        <Link href="/perfil" className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
          <p className="text-xs font-medium text-white truncate">{user.name}</p>
          <p className="text-xs" style={{ color: "var(--nm-purple-light)" }}>Nível {level} · Aluno</p>
        </Link>
        <button onClick={() => { logout(); router.push("/"); }} style={{ color: "var(--nm-text-muted)" }} title="Sair">
          <LogOut size={14} />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen neuromentor" style={{ background: "var(--nm-bg-base)", color: "var(--nm-text)" }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col py-5 px-3 flex-shrink-0"
        style={{ background: "var(--nm-sidebar)", borderRight: "1px solid var(--nm-border)" }}>
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="fixed top-0 left-0 h-full z-50 flex flex-col py-5 px-3 md:hidden transition-transform duration-300"
        style={{
          width: "224px",
          background: "var(--nm-sidebar)",
          borderRight: "1px solid var(--nm-border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
        onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => { if (e.changedTouches[0].clientX - touchStartX.current < -50) setOpen(false); }}
      >
        {sidebarContent}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex md:hidden items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--nm-border)", background: "var(--nm-sidebar)" }}>
          <button onClick={() => setOpen(true)} style={{ color: "var(--nm-text-muted)" }}>
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm text-white">NeuroMentor</span>
        </header>

        {children}
      </div>
    </div>
  );
}
