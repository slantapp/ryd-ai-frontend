import { useEffect, useState } from "react";

/** Show the first patience message after this many ms of loading. */
export const PAGE_LOAD_WAIT_INITIAL_MS = 10_000;
/** Show the extended message after this many ms of loading (total from start). */
export const PAGE_LOAD_WAIT_EXTENDED_MS = 25_000;

export type PageLoadWaitPhase = "none" | "initial" | "extended";

/**
 * Staged loading messages for slow avatar / page loads on mobile.
 * - After 10s: "Please wait while we load the page"
 * - After 25s total: extended "taking longer than usual" message
 */
export function usePageLoadWaitMessage(
  isLoading: boolean,
  options?: { enabled?: boolean },
): PageLoadWaitPhase {
  const enabled = options?.enabled ?? true;
  const [phase, setPhase] = useState<PageLoadWaitPhase>("none");

  useEffect(() => {
    if (!enabled || !isLoading) {
      setPhase("none");
      return;
    }

    const initialTimer = window.setTimeout(() => {
      setPhase("initial");
    }, PAGE_LOAD_WAIT_INITIAL_MS);

    const extendedTimer = window.setTimeout(() => {
      setPhase("extended");
    }, PAGE_LOAD_WAIT_EXTENDED_MS);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearTimeout(extendedTimer);
    };
  }, [enabled, isLoading]);

  return phase;
}
