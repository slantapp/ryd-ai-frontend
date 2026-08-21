// src/stores/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "@/lib/axios";
import type { LoginPayload } from "@/utils/loginCode";
import { useCoursesStore } from "@/stores/coursesStore";
import { useLocationDefaultsStore } from "@/stores/locationDefaultsStore";

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
  /** True after password-reset email — must change password before using the app. */
  mustResetPassword?: boolean;
  role?: { id: string; name: string };
  [key: string]: unknown;
}

export interface AiRegisterPayload {
  email: string;
  password: string;
  /** How the parent heard about RYD (sent as `survey` on register). */
  survey?: string;
  /** Optional agent / partner referral code. */
  referralCode?: string;
  /** Resolved via geo-IP (same source as subscription checkout). */
  country?: string;
}

export type ProfileUpdatePayload = {
  firstName: string;
  lastName: string;
};

/** Never persist these on `user` (API sometimes echoes password hash). */
const USER_OMIT_KEYS = new Set(["password", "token", "accessToken"]);

/** Coerce API booleans that may arrive as true | 1 | "true". */
function coerceMustResetPassword(value: unknown): boolean {
  return value === true || value === 1 || value === "true" || value === "1";
}

function sanitizeUser(obj: Record<string, unknown>): AuthUser {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!USER_OMIT_KEYS.has(key)) {
      out[key] = value;
    }
  }
  if ("mustResetPassword" in obj) {
    out.mustResetPassword = coerceMustResetPassword(obj.mustResetPassword);
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
  if (
    inner.user &&
    typeof inner.user === "object" &&
    !Array.isArray(inner.user)
  ) {
    const accessToken = (inner.accessToken ?? inner.token) as
      | string
      | undefined;
    if (!accessToken) {
      throw new Error("Invalid login response: missing token");
    }
    const nested = inner.user as Record<string, unknown>;
    const user = sanitizeUser({
      ...nested,
      mustResetPassword:
        nested.mustResetPassword ?? inner.mustResetPassword,
    });
    user.mustResetPassword = coerceMustResetPassword(
      nested.mustResetPassword ?? inner.mustResetPassword,
    );
    const expiresAt = (inner.expiresAt ?? null) as string | null;
    return {
      accessToken,
      user,
      expiresAt,
      mustResetPassword: user.mustResetPassword === true,
    };
  }

  // Parent AI shape: profile + `token` on the same object
  const accessToken = (inner.accessToken ?? inner.token) as string | undefined;
  if (!accessToken) {
    throw new Error("Invalid login response: missing token");
  }

  const user = sanitizeUser(inner);
  user.mustResetPassword = coerceMustResetPassword(inner.mustResetPassword);
  const expiresAt = (inner.expiresAt ?? null) as string | null;

  return {
    accessToken,
    user,
    expiresAt,
    mustResetPassword: user.mustResetPassword === true,
  };
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  expiresAt: string | null;
  isLoggedIn: boolean;
  /**
   * Top-level copy of login `mustResetPassword` so the blocking gate does not
   * depend only on a nested user field surviving persist/merge.
   */
  mustResetPassword: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: AiRegisterPayload) => Promise<void>;
  loginFromParentCode: (decoded: LoginPayload) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  /** After login: replace email temporary password with a new one (Bearer token). */
  updatePassword: (payload: {
    passwordOld: string;
    password1: string;
    password2: string;
  }) => Promise<void>;
  /** Post-payment: set parent first/last name. */
  updateProfile: (payload: ProfileUpdatePayload) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      expiresAt: null,
      isLoggedIn: false,
      mustResetPassword: false,
      login: async (email, password) => {
        const res = await axiosInstance.post("/parent/auth/login/ai", {
          email,
          password,
        });
        const { accessToken, user, expiresAt, mustResetPassword } =
          extractSession(res);
        set({
          accessToken,
          user,
          expiresAt,
          isLoggedIn: true,
          mustResetPassword,
        });
      },
      register: async (payload) => {
        const body = {
          email: payload.email.trim(),
          password: payload.password,
          ...(payload.survey?.trim() ? { survey: payload.survey.trim() } : {}),
          ...(payload.referralCode?.trim()
            ? { referralCode: payload.referralCode.trim() }
            : {}),
          ...(payload.country?.trim()
            ? { country: payload.country.trim() }
            : {}),
        };
        const res = await axiosInstance.post("/parent/auth/register/ai", body);
        const { accessToken, user, expiresAt, mustResetPassword } =
          extractSession(res);
        set({
          accessToken,
          user,
          expiresAt,
          isLoggedIn: true,
          mustResetPassword,
        });
      },
      loginFromParentCode: async (decoded: LoginPayload) => {
        const parentId = Number(decoded.parentId);
        let res;
        if (decoded.adminToken && typeof decoded.adminToken === "string") {
          res = await axiosInstance.post("/parent/auth/login/admin", {
            adminToken: decoded.adminToken,
            parentId,
            timestamp: decoded.timestamp,
          });
        } else if (
          decoded.parentToken &&
          typeof decoded.parentToken === "string"
        ) {
          res = await axiosInstance.post("/parent/auth/login/parent", {
            parentToken: decoded.parentToken,
            parentId,
            timestamp: decoded.timestamp,
          });
        } else {
          throw new Error("Invalid authorization code payload");
        }
        const { accessToken, user, expiresAt, mustResetPassword } =
          extractSession(res);
        set({
          accessToken,
          user,
          expiresAt,
          isLoggedIn: true,
          mustResetPassword,
        });
      },
      requestPasswordReset: async (email) => {
        await axiosInstance.post("/parent/auth/password-reset", { email });
      },
      updatePassword: async ({ passwordOld, password1, password2 }) => {
        const res = await axiosInstance.post("/parent/auth/password-update", {
          passwordOld,
          password1,
          password2,
        });
        const root = res.data as Record<string, unknown> | undefined;
        if (root && typeof root === "object" && root.status === false) {
          const msg = root.message;
          throw new Error(
            typeof msg === "string" ? msg : "Password update failed",
          );
        }
        set((state) => ({
          mustResetPassword: false,
          user: state.user
            ? { ...state.user, mustResetPassword: false }
            : state.user,
        }));
      },
      updateProfile: async ({ firstName, lastName }) => {
        const res = await axiosInstance.post("/parent/auth/profile-update", {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        });
        const root = res.data as Record<string, unknown> | undefined;
        if (root && typeof root === "object" && root.status === false) {
          const msg = root.message;
          throw new Error(
            typeof msg === "string" ? msg : "Profile update failed",
          );
        }

        const inner =
          root &&
          typeof root === "object" &&
          root.data &&
          typeof root.data === "object"
            ? (root.data as Record<string, unknown>)
            : null;
        const nextNames = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        };

        set((state) => {
          const base =
            inner && !Array.isArray(inner)
              ? { ...(state.user ?? {}), ...sanitizeUser(inner) }
              : { ...(state.user ?? {}) };
          // Profile update must not wipe an outstanding forced reset.
          const mustResetPassword =
            state.mustResetPassword ||
            coerceMustResetPassword(base.mustResetPassword);
          return {
            mustResetPassword,
            user: {
              ...base,
              ...nextNames,
              mustResetPassword,
            },
          };
        });
      },
      logout: () => {
        set({
          accessToken: null,
          user: null,
          expiresAt: null,
          isLoggedIn: false,
          mustResetPassword: false,
        });
        // Avoid leaking the previous user's in-memory progress/wishlist into the next session.
        // Persisted course data remains stored under the previous user's scoped key.
        useCoursesStore.getState().reset();
        useLocationDefaultsStore.getState().reset();
      },
    }),
    {
      name: "ryd-ai-platform-auth",
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AuthState>;
        const user = persisted.user ?? currentState.user;
        const fromPersistedFlag = coerceMustResetPassword(
          persisted.mustResetPassword,
        );
        const fromUser = coerceMustResetPassword(user?.mustResetPassword);
        return {
          ...currentState,
          ...persisted,
          mustResetPassword: fromPersistedFlag || fromUser,
          user: user
            ? {
                ...user,
                mustResetPassword: fromPersistedFlag || fromUser,
              }
            : null,
        };
      },
    },
  ),
);
