// src/stores/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "@/lib/axios";
import type { LoginPayload } from "@/utils/loginCode";

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: RoleProp;
}

interface RoleProp {
  id: string;
  name: string;
}

interface AuthState {
  user: Admin | null;
  accessToken: string | null;
  expiresAt: string | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginFromParentCode: (decoded: LoginPayload) => Promise<void>;
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
        const res = await axiosInstance.post("/admin/auth/signin", {
          email,
          password,
        });
        const { accessToken, user, expiresAt } = res.data.data;
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
        const data = res.data?.data ?? res.data;
        const accessToken = data?.accessToken ?? data?.token;
        if (!accessToken) {
          throw new Error("Invalid login response: missing token");
        }
        const { user, expiresAt } = data;
        set({
          accessToken,
          user,
          expiresAt: expiresAt ?? null,
          isLoggedIn: true,
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
      name: "ryd-ai-platform-auth", // localStorage key
    }
  )
);
