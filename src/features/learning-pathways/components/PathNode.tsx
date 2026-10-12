import { forwardRef } from "react";
import { Check, Dumbbell, Lock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PathNode as PathNodeData, PathNodeState, UnitPalette } from "../types";
import type { LessonProgress } from "../lessonProgress";
import { NODE_ICONS } from "./icons";
import { GOLD, nodeSize } from "./nodeStyle";

type PathNodeProps = {
  node: PathNodeData;
  state: PathNodeState;
  palette: UnitPalette;
  stars: number;
  open: boolean;
  /** Plays a pop-in when this node has just been unlocked. */
  justUnlocked?: boolean;
  /** The single "up next" lesson on the whole path (gets the white, palette-bordered highlight). */
  upNext?: boolean;
  /** Learn / practice progress for lesson nodes from real course progress. */
  progress?: LessonProgress;
  onToggle: () => void;
};

/**
 * Two-part ring around an in-progress lesson: one half is the lesson content (learn),
 * the other half the practice questions. Lessons without questions get one full ring.
 */
function ProgressRing({ size, progress, palette }: { size: number; progress: LessonProgress; palette: UnitPalette }) {
  const box = size + 16;
  const r = size / 2 + 5;
  const c = 2 * Math.PI * r;
  const hasPractice = progress.practiceTotal > 0;
  const learnLen = (hasPractice ? c / 2 : c) * Math.min(1, progress.learnFraction);
  const practiceLen = hasPractice ? (c / 2) * Math.min(1, progress.practiceDone / progress.practiceTotal) : 0;
  const gap = hasPractice ? 3 : 0;
  return (
    <svg
      className="pointer-events-none absolute"
      width={box}
      height={box}
      viewBox={`0 0 ${box} ${box}`}
      style={{ left: (size - box) / 2, top: (size - box) / 2 }}
      aria-hidden
    >
      <g transform={`rotate(-90 ${box / 2} ${box / 2})`}>
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="#E7E5EE" strokeWidth={4} />
        {/* learn: first half, clockwise from the top */}
        <circle
          cx={box / 2} cy={box / 2} r={r} fill="none" stroke={palette.base} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${Math.max(0, learnLen - gap)} ${c}`}
        />
        {/* practice: second half */}
        {hasPractice && practiceLen > 0 && (
          <circle
            cx={box / 2} cy={box / 2} r={r} fill="none" stroke={GOLD.base} strokeWidth={4} strokeLinecap="round"
            strokeDasharray={`${Math.max(0, practiceLen - gap)} ${c}`}
            strokeDashoffset={-(c / 2)}
          />
        )}
      </g>
    </svg>
  );
}

export const PathNode = forwardRef<HTMLButtonElement, PathNodeProps>(function PathNode(
  { node, state, palette, stars, open, justUnlocked, upNext, progress, onToggle },
  ref,
) {
  const Icon = NODE_ICONS[node.type];
  const size = nodeSize(node.type, state);
  const isChest = node.type === "chest";
  const isCheckpoint = node.type === "checkpoint";
  const shapeClass = isChest ? "lp-diamond" : isCheckpoint ? "lp-hex" : "rounded-full";
  const locked = state === "locked";
  // Only the path's single "up next" lesson gets the white + palette-border highlight.
  const current = upNext ?? state === "current";
  const learned = state === "learned";
  const done = state === "completed";
  const inProgress = !!progress && (state === "current" || learned);
  const practicePending = !!progress && progress.practiceTotal > 0 && !done && (learned || progress.practiceDone > 0);

  // Gold only for a cleared checkpoint (a reward); flat palette colours otherwise.
  const golden = isCheckpoint && done;
  const spentChest = isChest && done;
  // Calm, flat look: completed = solid palette fill; up next = white with a palette border;
  // other open lessons = soft tint; locked = light grey.
  const outlined = current && !done && !locked;
  const tinted = !locked && !done && !outlined;
  const background = locked
    ? "#F1F0F5"
    : golden
      ? GOLD.base
      : spentChest || tinted
        ? palette.soft
        : outlined
          ? "#FFFFFF"
          : palette.base;
  const iconColor = locked ? "#8E89A0" : golden ? "#132050" : done && !spentChest ? "#FFFFFF" : palette.base;
  // Borders are drawn as a backing shape so they follow the clip-path silhouettes too.
  const ringWidth = locked || tinted || spentChest ? 1.5 : outlined ? 3 : 0;
  const ringColor = locked ? "#D6D3DF" : outlined ? palette.base : `${palette.base}55`;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Calm static ring for the "up next" lesson */}
      {outlined && !inProgress && (
        <span
          className="pointer-events-none absolute rounded-full border-2"
          style={{ inset: -8, borderColor: `${palette.base}33` }}
          aria-hidden
        />
      )}

      {inProgress && progress && <ProgressRing size={size} progress={progress} palette={palette} />}

      {ringWidth > 0 && (
        <span
          className={cn("pointer-events-none absolute inset-0", shapeClass)}
          style={{ background: ringColor }}
          aria-hidden
        />
      )}

      <button
        ref={ref}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${node.title} — ${state}`}
        className={cn(
          "group relative flex items-center justify-center outline-none transition-transform duration-200 ease-out",
          "hover:scale-[1.07] active:scale-95 focus-visible:scale-[1.07]",
          shapeClass,
          open && "scale-[1.07]",
          justUnlocked && "lp-pop",
        )}
        style={{
          width: size - ringWidth * 2,
          height: size - ringWidth * 2,
          background,
        }}
      >
        {done && !isChest && !isCheckpoint ? (
          <Check className="relative size-7" style={{ color: iconColor }} strokeWidth={3.2} />
        ) : learned ? (
          <Dumbbell className="relative size-7" style={{ color: iconColor }} strokeWidth={2.4} />
        ) : (
          <Icon
            className={cn("relative", isCheckpoint ? "size-9" : current ? "size-8" : "size-6")}
            style={{ color: iconColor }}
            strokeWidth={2.2}
            fill={node.type === "lesson" && !locked ? iconColor : "none"}
          />
        )}
      </button>

      {locked && (
        <span className="pointer-events-none absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-white ring-1 ring-[#D6D3DF]">
          <Lock className="size-2.5 text-[#5B6478]" strokeWidth={3} />
        </span>
      )}

      {practicePending && progress && (
        <span className="pointer-events-none absolute -bottom-7 whitespace-nowrap rounded-full bg-[#FDF3DC] px-2 py-0.5 font-inter text-[10px] font-extrabold text-[#8A5A00] ring-1 ring-[#F5C04A]">
          Practice {progress.practiceDone}/{progress.practiceTotal}
        </span>
      )}

      {done && !isChest && (
        <div className="pointer-events-none absolute -bottom-6 flex gap-0.5" aria-label={`${stars} of 3 stars`}>
          {[1, 2, 3].map((i) => (
            <Star
              key={i}
              className="size-3"
              strokeWidth={2}
              style={{
                color: i <= stars ? GOLD.base : "#D6D3DF",
                fill: i <= stars ? GOLD.base : "transparent",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});
