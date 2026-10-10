import { ArrowRight, Clock, Loader2, Lock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PathNode, PathNodeState, UnitPalette } from "../types";
import type { LessonProgress } from "../lessonProgress";
import { GOLD } from "./nodeStyle";
import { NODE_ICONS, NODE_LABELS } from "./icons";

type NodePopoverProps = {
  node: PathNode;
  state: PathNodeState;
  palette: UnitPalette;
  /** Horizontal offset of the node from the path centre, in px (for the arrow). */
  arrowOffset: number;
  starting: boolean;
  /** Learn / practice progress for lesson nodes. */
  progress?: LessonProgress;
  onStart: () => void;
};

function ProgressRow({ label, value, fraction, color }: { label: string; value: string; fraction: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 font-inter text-xs">
        <span className="font-semibold text-[#4F4D55]">{label}</span>
        <span className="font-semibold tabular-nums text-[#0A090B]">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F0EEF4]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round(Math.min(1, fraction) * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

export function NodePopover({
  node,
  state,
  palette,
  arrowOffset,
  starting,
  progress,
  onStart,
}: NodePopoverProps) {
  const locked = state === "locked";
  const isChest = node.type === "chest";
  const spentChest = isChest && state === "completed";
  const disabled = locked || starting || spentChest;
  const Icon = NODE_ICONS[node.type];

  const lessonStarted = !!progress && (progress.learnFraction > 0 || progress.practiceDone > 0);
  const cta = locked
    ? "Locked"
    : spentChest
      ? "Already opened"
      : state === "completed"
        ? node.slug ? "Review course" : "Replay"
        : state === "learned"
          ? progress && progress.practiceTotal > 0 ? "Take the practice" : "Finish the lesson"
          : isChest
            ? "Open chest"
            : lessonStarted
              ? "Continue lesson"
              : node.type === "checkpoint"
                ? "Take checkpoint"
                : "Start lesson";

  return (
    <div
      role="dialog"
      aria-label={node.title}
      className="lp-pop absolute left-1/2 top-[calc(100%+6px)] z-30 w-[min(300px,calc(100%-12px))] -translate-x-1/2"
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className="absolute -top-1.5 size-3.5 -translate-x-1/2 rotate-45 rounded-[3px] bg-white"
        style={{ left: `calc(50% + ${arrowOffset}px)` }}
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-[20px] bg-white shadow-[0_24px_60px_-18px_rgba(10,9,11,0.6)]">
        <div
          className="relative flex items-center gap-3 px-4 pb-3 pt-4"
          style={{ background: locked ? "#F8F8FA" : `linear-gradient(135deg, ${palette.soft} 0%, #F3ECFE 100%)` }}
        >
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
            style={{
              background: locked ? "#CFCBD8" : `linear-gradient(135deg, ${palette.accent}, ${palette.base})`,
            }}
          >
            {locked ? <Lock className="size-4" /> : <Icon className="size-5" strokeWidth={2.2} />}
          </span>
          <div className="min-w-0">
            <p
              className="font-inter text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: locked ? "#9C96A8" : palette.base }}
            >
              {node.kindLabel ?? NODE_LABELS[node.type]}
            </p>
            <h3 className="truncate font-solway text-base font-bold text-[#0A090B]">{node.title}</h3>
          </div>
        </div>

        <div className="px-4 pb-4 pt-3">
          <p className="font-inter text-sm leading-relaxed text-[#4F4D55]">
            {locked
              ? "Finish the earlier lessons on the trail to unlock this one."
              : state === "learned"
                ? progress && progress.practiceTotal > 0
                  ? "You've covered this lesson. Answer its practice questions to complete it."
                  : "You've started this lesson. Finish it to light it up."
                : node.description}
          </p>

          {progress && !locked && !isChest && (
            <div className="mt-3 space-y-2.5">
              <ProgressRow
                label="Lesson"
                value={progress.learnFraction >= 1 ? "Done" : progress.learnFraction > 0 ? "In progress" : "Not started"}
                fraction={progress.learnFraction}
                color={palette.base}
              />
              {progress.practiceTotal > 0 && (
                <ProgressRow
                  label="Practice"
                  value={`${progress.practiceDone} of ${progress.practiceTotal} questions`}
                  fraction={progress.practiceDone / progress.practiceTotal}
                  color={GOLD.base}
                />
              )}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 font-inter text-xs font-semibold text-[#4F4D55]">
            {!isChest && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#F8F8FA] px-2.5 py-1">
                <Clock className="size-3.5" /> {node.minutes} min
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={onStart}
            className={cn(
              "group mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl font-solway text-sm font-bold transition-all duration-200",
              locked || spentChest
                ? "cursor-not-allowed bg-[#F0EEF4] text-[#9C96A8]"
                : "text-white hover:shadow-[0_10px_24px_-8px_var(--lp-cta)] active:scale-[0.98]",
            )}
            style={
              locked || spentChest
                ? undefined
                : ({
                    background: `linear-gradient(120deg, ${palette.base} 0%, ${palette.shade} 100%)`,
                    "--lp-cta": palette.base,
                  } as React.CSSProperties)
            }
          >
            {starting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : state === "completed" && !isChest ? (
              <RotateCcw className="size-4" />
            ) : null}
            {starting ? "Loading…" : cta}
            {!starting && !locked && !spentChest && state !== "completed" && (
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
          {node.slug && !locked && (
            <p className="mt-2 text-center font-inter text-[11px] text-[#9C96A8]">Opens the course where you left off.</p>
          )}
        </div>
      </div>
    </div>
  );
}
