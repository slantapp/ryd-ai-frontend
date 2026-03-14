// src/stores/authStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosInstance from "@/lib/axios";

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
