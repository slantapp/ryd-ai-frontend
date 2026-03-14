// src/stores/instructorStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type InstructorType = "woman" | "man";

export interface InstructorConfig {
  id: InstructorType;
  name: string;
  avatarUrl: string;
  avatarBody: "F" | "M";
  ttsVoice: string;
  description?: string;
}

export const INSTRUCTORS: Record<InstructorType, InstructorConfig> = {
  woman: {
    id: "woman",
    name: "Female Instructor",
    avatarUrl: "/avatars/avatar.glb",
    avatarBody: "F",
    ttsVoice: "aura-2-aurora-en",
    description: "Our friendly female instructor",
  },
  man: {
    id: "man",
    name: "Male Instructor",
    avatarUrl: "/avatars/male.glb", // Update this path when available
    avatarBody: "M",
    ttsVoice: "aura-2-mars-en", // Update this voice when available
    description: "Our friendly male instructor",
  },
};

interface InstructorState { 
  selectedInstructor: InstructorType;
  setSelectedInstructor: (instructor: InstructorType) => void;
  getInstructorConfig: () => InstructorConfig;
}

export const useInstructorStore = create<InstructorState>()(
  persist(
    (set, get) => ({
      selectedInstructor: "woman", // Default to woman instructor
      setSelectedInstructor: (instructor: InstructorType) => {
        set({ selectedInstructor: instructor });
      },
      getInstructorConfig: () => {
        const state = get();
        return INSTRUCTORS[state.selectedInstructor];
      },
    }),
    {
      name: "ryd-learning-instructor", // localStorage key
    }
  )
);
