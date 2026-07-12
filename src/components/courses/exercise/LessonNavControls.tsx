import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LessonNavSnapshot, PrimaryNavKind } from "@/utils/lessonNavigation";

interface LessonNavControlsProps {
  nav: LessonNavSnapshot;
  onPrevious: () => void;
  onPrimary: (kind: PrimaryNavKind) => void;
  showRestart?: boolean;
  onRestart?: () => void;
}

export default function LessonNavControls({
  nav,
  onPrevious,
  onPrimary,
  showRestart = false,
  onRestart,
}: LessonNavControlsProps) {
  const primaryClickable =
    nav.primary.enabled &&
    (nav.primary.kind === "start_questions" ||
      nav.primary.kind === "next_lesson" ||
      nav.primary.kind === "next_module");

  return (
    <div className="mb-4 shrink-0 rounded-2xl border border-primary/10 bg-white/60 p-3 shadow-sm backdrop-blur sm:p-4">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
          Lesson controls
        </p>
        <p className="mt-0.5 text-sm font-medium text-gray-800">
          {nav.positionLabel}
        </p>
        {nav.statusHint ? (
          <p className="mt-1 text-xs text-gray-500 sm:text-sm">{nav.statusHint}</p>
        ) : null}
      </div>

      <div className="flex gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!nav.canGoPrevious}
          className={cn(
            "min-w-0 flex-1 rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
            nav.canGoPrevious
              ? "bg-red-500 text-white shadow hover:bg-red-600"
              : "cursor-not-allowed bg-gray-200 text-gray-500",
          )}
        >
          {nav.previousLabel}
        </button>

        <button
          type="button"
          onClick={() => {
            if (primaryClickable) onPrimary(nav.primary.kind);
          }}
          disabled={!primaryClickable}
          className={cn(
            "min-w-0 flex-[1.4] rounded-xl px-2 py-2.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
            primaryClickable
              ? nav.primary.kind === "start_questions"
                ? "bg-primary text-white shadow hover:bg-primary/90"
                : "bg-green-500 text-white shadow hover:bg-green-600"
              : "cursor-not-allowed bg-gray-200 text-gray-500",
          )}
        >
          {nav.primary.label}
        </button>
      </div>

      {showRestart && onRestart ? (
        <button
          type="button"
          onClick={onRestart}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-amber-600"
        >
          <RotateCcw className="h-4 w-4" />
          Restart course
        </button>
      ) : null}
    </div>
  );
}
