// src/stores/userProfileStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserProfileState {
  avatar: string | null;
  setAvatar: (avatar: string) => void;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      avatar: null,
      setAvatar: (avatar: string) => {
        set({ avatar });
      },
    }),
    {
      name: "ryd-learning-user-profile", // localStorage key
    }
  )
);

