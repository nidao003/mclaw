import { create } from 'zustand';
import type { User, UserRole } from '../types/user';
import { authApi } from '../api/auth';

// ── Permission helpers (V2) ──────────────────────────────────

export function canPublish(role?: UserRole): boolean {
  if (!role) return false;
  return ['super_admin', 'admin', 'reviewer', 'publisher', 'enterprise'].includes(role);
}

export function canReview(role?: UserRole): boolean {
  if (!role) return false;
  return ['super_admin', 'admin', 'reviewer'].includes(role);
}

export function canManageUsers(role?: UserRole): boolean {
  if (!role) return false;
  return ['super_admin', 'admin'].includes(role);
}

export function isAdmin(role?: UserRole): boolean {
  return canReview(role);
}

// ── Auth Store ───────────────────────────────────────────────

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  // V2 computed getters
  isPublisher: () => boolean;
  isReviewer: () => boolean;
  isSuperAdmin: () => boolean;
}

// 全局认证状态 —— zustand store，任何组件都能读
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,

  checkAuth: async () => {
    try {
      const resp = await authApi.me();
      // /users/status 返回 { user: User, team: Team } 格式
      const data = resp as unknown as { user: User; team?: unknown };
      set({ user: data.user ?? resp });
    } catch {
      set({ user: null });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const resp = await authApi.login({ email, password });
      set({ user: resp.user, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const resp = await authApi.register({ email, password, name });
      set({ user: resp.user, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null });
    }
  },

  clearError: () => set({ error: null }),

  // V2 computed getters
  isPublisher: () => canPublish(get().user?.role),
  isReviewer: () => canReview(get().user?.role),
  isSuperAdmin: () => get().user?.role === 'super_admin',
}));
