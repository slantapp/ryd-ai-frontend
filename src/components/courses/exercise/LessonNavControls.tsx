import { ArrowLeft, RotateCcw } from "lucide-react";
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
    <div className="shrink-0 rounded-xl border border-primary/10 bg-white/70 p-2 shadow-sm backdrop-blur sm:p-2.5">
      {nav.statusHint ? (
        <p className="mb-1.5 line-clamp-1 px-0.5 text-[0.7rem] text-gray-500 sm:text-xs">
          {nav.statusHint}
        </p>
      ) : null}

      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!nav.canGoPrevious}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:text-sm",
            nav.canGoPrevious
              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400",
          )}
        >
          <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{nav.previousLabel}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (primaryClickable) onPrimary(nav.primary.kind);
          }}
          disabled={!primaryClickable}
          className={cn(
            "min-w-0 flex-[1.4] rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:text-sm",
            primaryClickable
              ? nav.primary.kind === "start_questions"
                ? "bg-primary text-white shadow hover:bg-primary/90"
                : "bg-green-500 text-white shadow hover:bg-green-600"
              : "cursor-not-allowed bg-gray-200 text-gray-500",
          )}
        >
          <span className="truncate">{nav.primary.label}</span>
        </button>
      </div>

      {showRestart && onRestart ? (
        <button
          type="button"
          onClick={onRestart}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white shadow transition-colors hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:text-sm"
        >
          <RotateCcw className="size-4" />
          Restart course
        </button>
      ) : null}
    </div>
  );
}
