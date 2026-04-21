import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/lib/api";

export type LessonStatus = "idle" | "uploading" | "processing" | "ready" | "error";

export interface LessonModule {
  id: string;
  title: string;
  summary: string;
  concepts: string[];
  match: number;
  status: "pending" | "approved" | "rejected";
}

export interface Lesson {
  id: string;
  title: string;
  sourceFileName: string;
  rawText: string;
  modules: LessonModule[];
  createdAt: string;
}

interface LessonState {
  currentLesson: Lesson | null;
  lessons: Lesson[];
  status: LessonStatus;
  progress: number;
  error: string | null;
  setCurrent: (lesson: Lesson | null) => void;
  upsertLesson: (lesson: Lesson) => void;
  setStatus: (status: LessonStatus, progress?: number) => void;
  setError: (error: string | null) => void;
  setModuleStatus: (moduleId: string, status: LessonModule["status"]) => void;
  mergeModules: (moduleId1: string, moduleId2: string) => Promise<{ ok: boolean; error?: string }>;
  deleteLesson: (lessonId: string) => Promise<{ ok: boolean; error?: string }>;
  loadTeacherLessons: () => Promise<void>;
  loadStudentLessons: () => Promise<void>;
}

function mapServerLesson(l: {
  id: string; title: string; sourceFileName: string; createdAt: string;
  modules: Array<{ id: string; title: string; summary: string; concepts: string[]; match: number; status: string; order: number }>;
}): Lesson {
  return {
    id: l.id,
    title: l.title,
    sourceFileName: l.sourceFileName,
    rawText: "",
    createdAt: l.createdAt,
    modules: l.modules.map((m) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      concepts: m.concepts,
      match: m.match,
      status: (m.status as LessonModule["status"]) ?? "pending",
    })),
  };
}

export const useLessonStore = create<LessonState>()(
  persist(
    (set, get) => ({
      currentLesson: null,
      lessons: [],
      status: "idle",
      progress: 0,
      error: null,
      setCurrent: (lesson) => set({ currentLesson: lesson }),
      upsertLesson: (lesson) =>
        set((s) => {
          const exists = s.lessons.find((l) => l.id === lesson.id);
          return {
            lessons: exists ? s.lessons.map((l) => (l.id === lesson.id ? lesson : l)) : [...s.lessons, lesson],
            currentLesson: lesson,
          };
        }),
      setStatus: (status, progress) => set((s) => ({ status, progress: progress ?? s.progress })),
      setError: (error) => set({ error }),

      setModuleStatus: (moduleId, status) => {
        const { currentLesson } = get();
        set((s) =>
          s.currentLesson
            ? {
                currentLesson: {
                  ...s.currentLesson,
                  modules: s.currentLesson.modules.map((m) => (m.id === moduleId ? { ...m, status } : m)),
                },
                lessons: s.lessons.map((l) =>
                  l.id === s.currentLesson!.id
                    ? { ...l, modules: l.modules.map((m) => (m.id === moduleId ? { ...m, status } : m)) }
                    : l
                ),
              }
            : s
        );
        if (currentLesson) {
          api.setModuleStatus(currentLesson.id, moduleId, status).catch(() => {});
        }
      },

      mergeModules: async (moduleId1, moduleId2) => {
        const { currentLesson } = get();
        if (!currentLesson) return { ok: false, error: "Nenhuma aula ativa." };
        try {
          const merged = await api.mergeModules(currentLesson.id, [moduleId1, moduleId2]);
          const newModule: LessonModule = {
            id: merged.id, title: merged.title, summary: merged.summary,
            concepts: merged.concepts, match: merged.match,
            status: merged.status as LessonModule["status"],
          };
          set((s) => {
            if (!s.currentLesson) return s;
            const updated = {
              ...s.currentLesson,
              modules: [
                ...s.currentLesson.modules.filter((m) => m.id !== moduleId1 && m.id !== moduleId2),
                newModule,
              ],
            };
            return {
              currentLesson: updated,
              lessons: s.lessons.map((l) => (l.id === updated.id ? updated : l)),
            };
          });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : "Erro ao mesclar." };
        }
      },

      deleteLesson: async (lessonId) => {
        try {
          await api.deleteLesson(lessonId);
          set((s) => {
            const lessons = s.lessons.filter((l) => l.id !== lessonId);
            const currentLesson =
              s.currentLesson?.id === lessonId ? (lessons[0] ?? null) : s.currentLesson;
            return { lessons, currentLesson };
          });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : "Erro ao deletar." };
        }
      },

      loadTeacherLessons: async () => {
        try {
          const data = await api.getLessons();
          const mapped = data.map(mapServerLesson);
          set((s) => {
            const merged = [...mapped];
            // Preserve rawText for lessons already in store
            s.lessons.forEach((existing) => {
              const idx = merged.findIndex((m) => m.id === existing.id);
              if (idx !== -1 && existing.rawText) {
                merged[idx] = { ...merged[idx], rawText: existing.rawText };
              }
            });
            const current = s.currentLesson
              ? merged.find((l) => l.id === s.currentLesson!.id) ?? s.currentLesson
              : merged[0] ?? null;
            return { lessons: merged, currentLesson: current };
          });
        } catch {}
      },

      loadStudentLessons: async () => {
        try {
          const data = await api.getAvailableLessons();
          const mapped = data.map(mapServerLesson);
          set((s) => {
            const current = s.currentLesson
              ? mapped.find((l) => l.id === s.currentLesson!.id) ?? mapped[0] ?? null
              : mapped[0] ?? null;
            return { lessons: mapped, currentLesson: current };
          });
        } catch {}
      },
    }),
    {
      name: "neuromentor-lessons",
      partialize: (state) => ({
        ...state,
        lessons: state.lessons.map((l) => ({ ...l, rawText: l.rawText.slice(0, 15000) })),
        currentLesson: state.currentLesson
          ? { ...state.currentLesson, rawText: state.currentLesson.rawText.slice(0, 15000) }
          : null,
      }),
    }
  )
);
