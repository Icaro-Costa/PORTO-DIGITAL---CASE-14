export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5053";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("neuromentor-auth");
    return raw ? (JSON.parse(raw)?.state?.token ?? null) : null;
  } catch {
    return null;
  }
}

// Set by auth store to trigger logout on 401
let _on401: (() => void) | null = null;
export function setOn401Handler(fn: () => void) {
  _on401 = fn;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401) {
    _on401?.();
    throw new ApiError(401, "Sessão expirada. Faça login novamente.");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json?.error) message = json.error;
      else if (json?.title) message = json.title;
    } catch {}
    throw new ApiError(res.status, message, text);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (res.status === 401) {
    _on401?.();
    throw new ApiError(401, "Sessão expirada.");
  }
  if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => ""));
  return res.json() as Promise<T>;
}

// Flat response from C# AuthController
export interface AuthResponse {
  token: string;
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher";
  photoUrl?: string;
  matricula?: string;
  subject?: string;
  isAiEnabled: boolean;
  isAdmin: boolean;
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────
  me() {
    return request<AuthResponse>("/api/auth/me");
  },

  login(email: string, password: string) {
    return request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  register(data: { name: string; email: string; password: string; role: string }) {
    return request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  changePassword(currentPassword: string, newPassword: string) {
    return request<void>("/api/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  updateProfile(fields: { name?: string; photo?: string; matricula?: string; subject?: string }) {
    return request<void>("/api/auth/profile", {
      method: "PUT",
      // Map photo → photoUrl for the C# endpoint
      body: JSON.stringify({
        name: fields.name,
        photoUrl: fields.photo,
        matricula: fields.matricula,
        subject: fields.subject,
      }),
    });
  },

  // ── Lessons ─────────────────────────────────────────────────────────────
  uploadFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    return uploadForm<{ lessonId: string; title: string; text: string; chars: number }>(
      "/api/lessons/upload",
      form
    );
  },

  generateModules(payload: { lessonId: string; text: string; title: string }) {
    return request<{
      modules: Array<{
        id: string;
        title: string;
        summary: string;
        concepts: string[];
        match: number;
        status: string;
        order: number;
      }>;
    }>("/api/lessons/generate", { method: "POST", body: JSON.stringify(payload) });
  },

  getLessons() {
    return request<Array<{
      id: string; title: string; sourceFileName: string; createdAt: string;
      modules: Array<{ id: string; title: string; summary: string; concepts: string[]; match: number; status: string; order: number }>;
    }>>("/api/lessons");
  },

  getAvailableLessons() {
    return request<Array<{
      id: string; title: string; sourceFileName: string; createdAt: string;
      modules: Array<{ id: string; title: string; summary: string; concepts: string[]; match: number; status: string; order: number }>;
    }>>("/api/lessons/available");
  },

  setModuleStatus(lessonId: string, moduleId: string, status: string) {
    return request<void>(`/api/lessons/${lessonId}/modules/${moduleId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },

  deleteLesson(lessonId: string) {
    return request<void>(`/api/lessons/${lessonId}`, { method: "DELETE" });
  },

  mergeModules(lessonId: string, moduleIds: [string, string]) {
    return request<{ id: string; title: string; summary: string; concepts: string[]; match: number; status: string; order: number }>(
      `/api/lessons/${lessonId}/modules/merge`,
      { method: "POST", body: JSON.stringify({ moduleIds }) }
    );
  },

  getAttempts(limit = 20) {
    return request<Array<{
      id: string; question: string; answer: string; isCorrect: boolean;
      feedback: string; xpGained: number; lessonId: string; moduleId: string; createdAt: string;
    }>>(`/api/exercises/attempts?limit=${limit}`);
  },

  // ── Exercises ────────────────────────────────────────────────────────────
  generateExercises(payload: {
    lessonId?: string;
    moduleId?: string;
    moduleTitle: string;
    context?: string;
    count?: number;
  }) {
    return request<{
      exercises: Array<{
        id: string;
        question: string;
        type: "open" | "multiple_choice";
        options?: string[];
      }>;
    }>("/api/exercises/generate", { method: "POST", body: JSON.stringify(payload) });
  },

  correctAnswer(payload: { question: string; answer: string; context?: string }) {
    return request<{ correct: boolean; feedback: string; teacherExplanation?: string }>(
      "/api/exercises/correct",
      { method: "POST", body: JSON.stringify(payload) }
    );
  },

  recordAttempt(payload: {
    lessonId?: string;
    moduleId: string;
    question: string;
    answer: string;
    isCorrect: boolean;
    feedback: string;
    teacherExplanation?: string;
    pendingReview?: boolean;
  }) {
    return request<{ id: string; xpGained: number }>("/api/exercises/attempts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getPendingReviews() {
    return request<Array<{
      id: string; question: string; answer: string; isCorrect: boolean;
      feedback: string; teacherExplanation?: string; xpGained: number;
      createdAt: string; studentName: string; studentEmail: string;
    }>>("/api/exercises/attempts/pending-review");
  },

  reviewAttempt(id: string, status: "accepted" | "rejected", note?: string) {
    return request<{ id: string; reviewStatus: string }>(
      `/api/exercises/attempts/${id}/review`,
      { method: "PUT", body: JSON.stringify({ status, note }) }
    );
  },

  // ── Review ───────────────────────────────────────────────────────────────
  generateReview(payload: {
    lessonId?: string;
    wrongAnswers: Array<{ question: string; answer: string }>;
    context?: string;
  }) {
    const body = {
      lessonId: payload.lessonId,
      context: payload.context,
      wrongAnswers: payload.wrongAnswers.map(
        (w) => `Pergunta: ${w.question} | Resposta do aluno: ${w.answer}`
      ),
    };
    return request<{
      topics: Array<{ title: string; explanation: string; tips: string[] }>;
      summary: string;
    }>("/api/review/generate", { method: "POST", body: JSON.stringify(body) });
  },

  // ── Admin ────────────────────────────────────────────────────────────────
  getAdminUsers(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<Array<{
      id: string; name: string; email: string; role: string;
      photoUrl?: string; isAiEnabled: boolean; isAdmin: boolean; createdAt: string;
    }>>(`/api/admin/users${q}`);
  },

  setAiAccess(userId: string, enabled: boolean) {
    return request<{ id: string; isAiEnabled: boolean }>(
      `/api/admin/users/${userId}/ai-access`,
      { method: "PUT", body: JSON.stringify({ enabled }) }
    );
  },

  createAdminUser(data: { name: string; email: string; password: string }) {
    return request<{ id: string; name: string; email: string }>(
      "/api/admin/users",
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  deleteUser(userId: string) {
    return request<{ deleted: string }>(`/api/admin/users/${userId}`, { method: "DELETE" });
  },

  getAdminLessons() {
    return request<Array<{
      id: string; title: string; sourceFileName: string; createdAt: string;
      teacherName: string; teacherEmail: string; moduleCount: number;
      rawTextSize: number; hasRawText: boolean;
    }>>("/api/admin/lessons");
  },

  clearLessonRawText(lessonId: string) {
    return request<{ id: string; cleared: boolean }>(
      `/api/admin/lessons/${lessonId}/raw-text`,
      { method: "DELETE" }
    );
  },

  // ── Classes ──────────────────────────────────────────────────────────────
  createClass(name: string) {
    return request<ClassDto>("/api/classes", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  getTeacherClasses() {
    return request<ClassDto[]>("/api/classes");
  },

  getStudentClasses() {
    return request<ClassDto[]>("/api/classes/my");
  },

  getStudentLessonIds() {
    return request<string[]>("/api/classes/my/lesson-ids");
  },

  joinClass(code: string) {
    return request<ClassDto>("/api/classes/join", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  addLessonToClass(classId: string, lessonId: string, title: string) {
    return request<void>(`/api/classes/${classId}/lessons`, {
      method: "POST",
      body: JSON.stringify({ lessonId, title }),
    });
  },

  removeLessonFromClass(classId: string, lessonId: string) {
    return request<void>(`/api/classes/${classId}/lessons/${lessonId}`, {
      method: "DELETE",
    });
  },

  deleteClass(classId: string) {
    return request<void>(`/api/classes/${classId}`, { method: "DELETE" });
  },
};

export interface ClassDto {
  id: string;
  name: string;
  code: string;
  teacherName: string;
  createdAt: string;
  lessons: Array<{ id: string; title: string }>;
  students: Array<{ id: string; name: string; email: string; joinedAt: string }>;
}
