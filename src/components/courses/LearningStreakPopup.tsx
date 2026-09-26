import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  streakPopupHeadline,
  subscribeLearningStreak,
} from "@/features/curriculum-preview/v2/learningStreakEvents";
import { isStreakMilestone } from "@/features/curriculum-preview/v2/learningSfx";

const SHOW_MS = 2000;
const EXIT_MS = 380;

type PopupState = {
  streak: number;
  key: number;
  exiting: boolean;
};

/**
 * Duolingo-style consecutive-correct celebration.
 * Listens for streak events and auto-dismisses quickly.
 * Mount once near the course shell (CourseRunner / preview / sneak peek).
 */
export function LearningStreakPopup() {
  const styleId = useId().replace(/:/g, "");
  const [popup, setPopup] = useState<PopupState | null>(null);

  useEffect(() => {
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let clearTimer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = subscribeLearningStreak((streak) => {
      if (exitTimer) clearTimeout(exitTimer);
      if (clearTimer) clearTimeout(clearTimer);

      setPopup({ streak, key: Date.now(), exiting: false });

      exitTimer = setTimeout(() => {
        setPopup((prev) => (prev ? { ...prev, exiting: true } : null));
        clearTimer = setTimeout(() => setPopup(null), EXIT_MS);
      }, SHOW_MS);
    });

    return () => {
      unsubscribe();
      if (exitTimer) clearTimeout(exitTimer);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, []);

  if (typeof document === "undefined" || !popup) return null;

  const milestone = isStreakMilestone(popup.streak);

  return createPortal(
    <>
      <style>{`
        @keyframes ryd-streak-in-${styleId} {
          0% { opacity: 0; transform: translateY(18px) scale(0.72); }
          55% { opacity: 1; transform: translateY(-6px) scale(1.08); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ryd-streak-out-${styleId} {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-28px) scale(0.92); }
        }
        @keyframes ryd-streak-flame-${styleId} {
          0%, 100% { transform: scale(1) rotate(-4deg); }
          50% { transform: scale(1.12) rotate(4deg); }
        }
        @keyframes ryd-streak-pop-${styleId} {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
      <div
        className="pointer-events-none fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[min(22vh,9rem)]"
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          key={popup.key}
          className={cn(
            "relative flex max-w-[min(92vw,20rem)] flex-col items-center gap-1 rounded-3xl px-7 py-5 text-center shadow-2xl",
            milestone
              ? "bg-linear-to-br from-amber-400 via-orange-400 to-orange-500 text-white shadow-orange-400/40"
              : "bg-linear-to-br from-amber-300 via-amber-400 to-orange-400 text-white shadow-amber-400/35",
          )}
          style={{
            animation: popup.exiting
              ? `ryd-streak-out-${styleId} ${EXIT_MS}ms ease-in forwards`
              : `ryd-streak-in-${styleId} 420ms cubic-bezier(0.22, 1.4, 0.36, 1) both`,
          }}
        >
          <div
            className="mb-0.5 flex size-12 items-center justify-center rounded-full bg-white/25 ring-2 ring-white/40 backdrop-blur-sm"
            style={{
              animation: popup.exiting
                ? undefined
                : `ryd-streak-flame-${styleId} 700ms ease-in-out infinite`,
            }}
          >
            <Flame
              className="size-7 fill-white text-white drop-shadow-sm"
              aria-hidden
            />
          </div>

          <p
            className="font-solway text-5xl font-black leading-none tracking-tight tabular-nums drop-shadow-sm sm:text-6xl"
            style={{
              animation: popup.exiting
                ? undefined
                : `ryd-streak-pop-${styleId} 480ms cubic-bezier(0.22, 1.5, 0.36, 1) 80ms both`,
            }}
          >
            {popup.streak}
          </p>

          <p className="font-solway text-base font-bold tracking-wide sm:text-lg">
            in a row!
          </p>
          <p className="font-inter text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
            {streakPopupHeadline(popup.streak)}
          </p>

          {/* Soft glow ring */}
          <div
            className="pointer-events-none absolute -inset-1 -z-10 rounded-[1.75rem] bg-orange-300/40 blur-md"
            aria-hidden
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
