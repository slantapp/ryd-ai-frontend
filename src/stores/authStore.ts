// src/stores/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "@/lib/axios";
import type { LoginPayload } from "@/utils/loginCode";

/**
 * Parent profile from `/parent/auth/login/ai` (and similar) — stored without
 * `password` or auth `token` (those are not kept on `user`).
 */
export interface AuthUser {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  state?: string;
  timezone?: string;
  userType?: string;
  canAccessAi?: boolean;
  canAccessNormal?: boolean;
  signupSource?: string;
  privacyMode?: boolean;
  role?: { id: string; name: string };
  [key: string]: unknown;
}

export interface AiRegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  state: string;
  timezone: string;
}

/** Never persist these on `user` (API sometimes echoes password hash). */
const USER_OMIT_KEYS = new Set(["password", "token", "accessToken"]);

function sanitizeUser(obj: Record<string, unknown>): AuthUser {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!USER_OMIT_KEYS.has(key)) {
      out[key] = value;
    }
  }
  return out as AuthUser;
}

function extractSession(res: { data?: unknown }) {
  const root = res.data as Record<string, unknown> | undefined;
  if (!root || typeof root !== "object") {
    throw new Error("Invalid login response");
  }

  if (root.status === false) {
    const msg = root.message;
    throw new Error(typeof msg === "string" ? msg : "Request failed");
  }

  const inner = root.data as Record<string, unknown> | undefined;
  if (!inner || typeof inner !== "object") {
    throw new Error("Invalid login response");
  }

  // Legacy / alternate shape: { accessToken?, token?, user: {...}, expiresAt? }
  if (inner.user && typeof inner.user === "object" && !Array.isArray(inner.user)) {
    const accessToken = (inner.accessToken ?? inner.token) as string | undefined;
    if (!accessToken) {
      throw new Error("Invalid login response: missing token");
    }
    const user = sanitizeUser(inner.user as Record<string, unknown>);
    const expiresAt = (inner.expiresAt ?? null) as string | null;
    return { accessToken, user, expiresAt };
  }

  // Parent AI shape: profile + `token` on the same object
  const accessToken = (inner.accessToken ?? inner.token) as string | undefined;
  if (!accessToken) {
    throw new Error("Invalid login response: missing token");
  }

  const user = sanitizeUser(inner);
  const expiresAt = (inner.expiresAt ?? null) as string | null;

  return { accessToken, user, expiresAt };
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  expiresAt: string | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: AiRegisterPayload) => Promise<void>;
  loginFromParentCode: (decoded: LoginPayload) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  /** Temporary code from email + new password (same `/parent/auth/password-reset` endpoint) */
  completePasswordReset: (payload: {
    email: string;
    code: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      expiresAt: null,
      isLoggedIn: false,
      login: async (email, password) => {
        const res = await axiosInstance.post("/parent/auth/login/ai", {
          email,
          password,
        });
        const { accessToken, user, expiresAt } = extractSession(res);
        set({
          accessToken,
          user,
          expiresAt,
          isLoggedIn: true,
        });
      },
      register: async (payload) => {
        const res = await axiosInstance.post("/parent/auth/register/ai", payload);
        const { accessToken, user, expiresAt } = extractSession(res);
        set({
          accessToken,
          user,
          expiresAt,
          isLoggedIn: true,
        });
      },
      loginFromParentCode: async (decoded: LoginPayload) => {
        const res = await axiosInstance.post("/auth/login/parent", {
          parentToken: decoded.parentToken,
          parentId: decoded.parentId,
        });
        const { accessToken, user, expiresAt } = extractSession(res);
        set({
          accessToken,
          user,
          expiresAt,
          isLoggedIn: true,
        });
      },
      requestPasswordReset: async (email) => {
        await axiosInstance.post("/parent/auth/password-reset", { email });
      },
      completePasswordReset: async ({ email, code, password }) => {
        await axiosInstance.post("/parent/auth/password-reset", {
          email,
          code,
          password,
        });
      },
      logout: () => {
        set({
          accessToken: null,
          user: null,
          expiresAt: null,
          isLoggedIn: false,
        });
      },
    }),
    {
      name: "ryd-ai-platform-auth",
    }
  )
);
