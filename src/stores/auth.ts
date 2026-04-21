import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, setOn401Handler, AuthResponse } from "@/lib/api";

export type Role = "student" | "teacher";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  photo?: string;
  matricula?: string;
  subject?: string;
  isAiEnabled: boolean;
  isAdmin: boolean;
}

function mapAuthResponse(res: AuthResponse): User {
  return {
    id: res.id,
    name: res.name,
    email: res.email,
    role: res.role as Role,
    photo: res.photoUrl,
    matricula: res.matricula,
    subject: res.subject,
    isAiEnabled: res.isAiEnabled ?? false,
    isAdmin: res.isAdmin ?? false,
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (
    fields: Partial<Pick<User, "name" | "photo" | "matricula" | "subject">>
  ) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (
    current: string,
    newPw: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => {
      // Register 401 handler once the store is created
      setOn401Handler(() => set({ user: null, token: null }));

      return {
        user: null,
        token: null,

        loginWithCredentials: async (email, password) => {
          try {
            const res = await api.login(email, password);
            set({ token: res.token, user: mapAuthResponse(res) });
            return { ok: true };
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Erro ao entrar.";
            return { ok: false, error: msg };
          }
        },

        register: async ({ name, email, password, role }) => {
          try {
            const res = await api.register({ name, email, password, role });
            set({ token: res.token, user: mapAuthResponse(res) });
            return { ok: true };
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Erro ao criar conta.";
            return { ok: false, error: msg };
          }
        },

        logout: () => set({ user: null, token: null }),

        updateProfile: async (fields) => {
          try {
            await api.updateProfile(fields);
            set((s) => ({ user: s.user ? { ...s.user, ...fields } : s.user }));
            return { ok: true };
          } catch (e: unknown) {
            return { ok: false, error: e instanceof Error ? e.message : "Erro." };
          }
        },

        changePassword: async (current, newPw) => {
          try {
            await api.changePassword(current, newPw);
            return { ok: true };
          } catch (e: unknown) {
            return { ok: false, error: e instanceof Error ? e.message : "Erro ao alterar senha." };
          }
        },
      };
    },
    {
      name: "neuromentor-auth",
      partialize: (s) => ({ user: s.user, token: s.token }),
      merge: (persisted: unknown, current) => {
        const p = persisted as typeof current;
        return {
          ...current,
          ...p,
          user: p.user ? {
            isAiEnabled: false,
            isAdmin: false,
            ...p.user,
          } : null,
        };
      },
    }
  )
);
