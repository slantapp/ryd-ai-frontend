import { create } from "zustand";
import type { LocationDefaults } from "@/utils/resolveLocationDefaults";
import {
  inferLocationDefaults,
  resolveLocationDefaults,
} from "@/utils/resolveLocationDefaults";

type EnsureResolvedOptions = {
  force?: boolean;
  /** Passed through to the geo-IP lookup. */
  timeoutMs?: number;
};

type LocationDefaultsState = {
  defaults: LocationDefaults;
  resolved: boolean;
  resolving: boolean;
  /** Resolve once per session (or force refresh). */
  ensureResolved: (options?: EnsureResolvedOptions) => Promise<LocationDefaults>;
  /**
   * For checkout: return cached country, or force a longer geo-IP retry when
   * country is still empty after the first attempt.
   */
  ensureCountryForCheckout: () => Promise<LocationDefaults>;
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
    ensureResolved: async ({ force = false, timeoutMs } = {}) => {
      if (!force && get().resolved) {
        return get().defaults;
      }
      if (!force && inFlight) {
        return inFlight;
      }
      if (force && inFlight) {
        try {
          await inFlight;
        } catch {
          /* previous lookup finished (success or fallback) */
        }
      }

      set({ resolving: true });
      inFlight = resolveLocationDefaults({ timeoutMs })
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
    ensureCountryForCheckout: async () => {
      const { ensureResolved } = get();
      let location = await ensureResolved();
      if (location.country?.trim()) {
        return location;
      }
      // Prefetch may have timed out or failed — retry once with a longer window.
      location = await ensureResolved({ force: true, timeoutMs: 4500 });
      return location;
    },
  }),
);
