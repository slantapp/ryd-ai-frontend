import { create } from "zustand";
import type { LocationDefaults } from "@/utils/resolveLocationDefaults";
import {
  inferLocationDefaults,
  resolveLocationDefaults,
} from "@/utils/resolveLocationDefaults";

type LocationDefaultsState = {
  defaults: LocationDefaults;
  resolved: boolean;
  resolving: boolean;
  /** Resolve once per session (or force refresh). */
  ensureResolved: (options?: { force?: boolean }) => Promise<LocationDefaults>;
  setDefaults: (defaults: LocationDefaults) => void;
  reset: () => void;
};

const initialDefaults = inferLocationDefaults();

/** Shared in-flight promise so concurrent callers await the same resolve. */
let inFlight: Promise<LocationDefaults> | null = null;

export const useLocationDefaultsStore = create<LocationDefaultsState>(
  (set, get) => ({
    defaults: initialDefaults,
    resolved: false,
    resolving: false,
    setDefaults: (defaults) => set({ defaults, resolved: true }),
    reset: () => {
      inFlight = null;
      set({
        defaults: inferLocationDefaults(),
        resolved: false,
        resolving: false,
      });
    },
    ensureResolved: async ({ force = false } = {}) => {
      if (!force && get().resolved) {
        return get().defaults;
      }
      if (!force && inFlight) {
        return inFlight;
      }

      set({ resolving: true });
      inFlight = resolveLocationDefaults()
        .then((defaults) => {
          set({ defaults, resolved: true, resolving: false });
          inFlight = null;
          return defaults;
        })
        .catch(() => {
          const defaults = inferLocationDefaults();
          set({ defaults, resolved: true, resolving: false });
          inFlight = null;
          return defaults;
        });

      return inFlight;
    },
  }),
);
