import { useEffect, useRef } from "react";
import { reportCourseActivity } from "@/api/courseActivity";
import { isDemoCourseSlug } from "@/data/curriculumData";

/** Flush accumulated time at least this often while the tab is visible. */
const HEARTBEAT_MS = 60_000;

function nowMs() {
  return Date.now();
}

function elapsedSeconds(sinceMs: number): number {
  return Math.max(0, Math.floor((nowMs() - sinceMs) / 1000));
}

/**
 * Tracks time spent on a course and reports it to
 * `POST /parent/courses/:courseSlug/activity`.
 *
 * - Open / resume visible: `{ deltaSeconds: 0, newSession: true }`
 * - Lesson idle / heartbeat / background / leave: `{ deltaSeconds, newSession: false }`
 */
export function useCourseLearningSession(courseSlug: string | undefined) {
  const slugRef = useRef(courseSlug);
  const segmentStartRef = useRef<number | null>(null);
  const sessionActiveRef = useRef(false);

  useEffect(() => {
    slugRef.current = courseSlug;
  }, [courseSlug]);

  useEffect(() => {
    if (!courseSlug || isDemoCourseSlug(courseSlug)) return;

    let cancelled = false;

    const post = (body: { deltaSeconds: number; newSession: boolean }) => {
      const slug = slugRef.current;
      if (!slug || isDemoCourseSlug(slug) || cancelled) return;
      void reportCourseActivity(slug, body).catch(() => {
        // Best-effort metrics — don't interrupt learning on failure.
      });
    };

    const startSession = () => {
      if (document.visibilityState === "hidden") return;
      sessionActiveRef.current = true;
      segmentStartRef.current = nowMs();
      post({ deltaSeconds: 0, newSession: true });
    };

    const flushDelta = () => {
      if (!sessionActiveRef.current || segmentStartRef.current == null) return;
      const delta = elapsedSeconds(segmentStartRef.current);
      segmentStartRef.current = nowMs();
      if (delta <= 0) return;
      post({ deltaSeconds: delta, newSession: false });
    };

    const endSession = () => {
      flushDelta();
      sessionActiveRef.current = false;
      segmentStartRef.current = null;
    };

    startSession();

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        endSession();
      } else {
        startSession();
      }
    };

    const onPageHide = () => {
      endSession();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    const heartbeatId = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      if (!sessionActiveRef.current) return;
      flushDelta();
    }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeatId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      // Final flush for navigate-away / slug change (ignore cancelled for this post).
      const slug = courseSlug;
      if (
        slug &&
        !isDemoCourseSlug(slug) &&
        sessionActiveRef.current &&
        segmentStartRef.current != null
      ) {
        const delta = elapsedSeconds(segmentStartRef.current);
        sessionActiveRef.current = false;
        segmentStartRef.current = null;
        if (delta > 0) {
          void reportCourseActivity(slug, {
            deltaSeconds: delta,
            newSession: false,
          }).catch(() => {});
        }
      }
    };
  }, [courseSlug]);
}
