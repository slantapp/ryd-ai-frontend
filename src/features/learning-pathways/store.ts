import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "@/stores/authStore";

/**
 * Learning Path UI state only, per signed-in user. Progress comes from course progress and
 * streak / daily goal / badges from GET /parent/learning/stats, so nothing here is "the truth".
 */

/** Shown in the celebration after a lesson; values come from the server stats. */
export type CompletionResult = {
  streak: number;
  streakExtended: boolean;
  dailyGoalReached: boolean;
};

type UserPathUi = {
  activePathwayId: string;
  /** pathwayId -> completed lesson node ids already celebrated (or seen on first visit). */
  seen: Record<string, string[]>;
};

type PathwayUiState = {
  byUser: Record<string, UserPathUi>;
  setActivePathway: (userKey: string, pathwayId: string) => void;
  markSeen: (userKey: string, pathwayId: string, nodeIds: string[]) => void;
};

const emptyUser = (): UserPathUi => ({ activePathwayId: "", seen: {} });

// The old demo store (XP, gems, mock progress) is no longer used.
try {
  window.localStorage.removeItem("ryd-learning-pathways-mock");
} catch {
  // storage unavailable
}

const usePathwayUiStore = create<PathwayUiState>()(
  persist(
    (set) => ({
      byUser: {},
      setActivePathway: (userKey, pathwayId) =>
        set((s) => ({
          byUser: { ...s.byUser, [userKey]: { ...(s.byUser[userKey] ?? emptyUser()), activePathwayId: pathwayId } },
        })),
      markSeen: (userKey, pathwayId, nodeIds) =>
        set((s) => {
          const user = s.byUser[userKey] ?? emptyUser();
          const merged = Array.from(new Set([...(user.seen[pathwayId] ?? []), ...nodeIds]));
          return { byUser: { ...s.byUser, [userKey]: { ...user, seen: { ...user.seen, [pathwayId]: merged } } } };
        }),
    }),
    { name: "ryd-learning-paths-ui", version: 1 },
  ),
);

/** Learning Path UI state for the signed-in user. */
export function usePathwayUi() {
  const userKey = String(useAuthStore((s) => s.user?.id ?? "anonymous"));
  const user = usePathwayUiStore((s) => s.byUser[userKey]);
  const setActive = usePathwayUiStore((s) => s.setActivePathway);
  const markSeenRaw = usePathwayUiStore((s) => s.markSeen);
  return {
    activePathwayId: user?.activePathwayId ?? "",
    seen: user?.seen ?? {},
    hasVisited: (pathwayId: string) => !!user?.seen?.[pathwayId],
    setActivePathway: (pathwayId: string) => setActive(userKey, pathwayId),
    markSeen: (pathwayId: string, nodeIds: string[]) => markSeenRaw(userKey, pathwayId, nodeIds),
  };
}
