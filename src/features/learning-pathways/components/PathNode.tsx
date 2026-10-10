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
  /** The single "up next" lesson on the whole path (gets the orbit + glow). */
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
        <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="rgba(243,236,254,0.16)" strokeWidth={4} />
        {/* learn: first half, clockwise from the top */}
        <circle
          cx={box / 2} cy={box / 2} r={r} fill="none" stroke={palette.accent} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${Math.max(0, learnLen - gap)} ${c}`}
          style={{ filter: `drop-shadow(0 0 4px ${palette.accent})` }}
        />
        {/* practice: second half */}
        {hasPractice && practiceLen > 0 && (
          <circle
            cx={box / 2} cy={box / 2} r={r} fill="none" stroke={GOLD.base} strokeWidth={4} strokeLinecap="round"
            strokeDasharray={`${Math.max(0, practiceLen - gap)} ${c}`}
            strokeDashoffset={-(c / 2)}
            style={{ filter: `drop-shadow(0 0 4px ${GOLD.base})` }}
          />
        )}
      </g>
    </svg>
  );
}

function orbFill(top: string, mid: string, bottom: string) {
  return `radial-gradient(circle at 32% 26%, ${top} 0%, ${mid} 48%, ${bottom} 100%)`;
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
  // Orbit/glow only for the path's single "up next" lesson; other in-progress lessons stay calm.
  const current = upNext ?? state === "current";
  const learned = state === "learned";
  const done = state === "completed";
  const inProgress = !!progress && (state === "current" || learned);
  const practicePending = !!progress && progress.practiceTotal > 0 && !done && (learned || progress.practiceDone > 0);

  // Gold for rewards (current chest, cleared checkpoint); brand gradient otherwise.
  const golden = (isChest && current) || (isCheckpoint && done);
  const glowColor = golden ? GOLD.base : palette.base;
  const background = locked
    ? "rgba(255,255,255,0.08)"
    : golden
      ? orbFill(GOLD.light, GOLD.base, GOLD.deep)
      : isChest && done
        ? orbFill(`${palette.accent}AA`, `${palette.base}88`, `${palette.shade}88`)
        : orbFill(palette.accent, palette.base, palette.shade);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Soft halo */}
      {!locked && (
        <span
          className={cn("pointer-events-none absolute rounded-full blur-xl", current ? "lp-glow" : "opacity-50")}
          style={{ inset: current ? -18 : -8, background: glowColor }}
          aria-hidden
        />
      )}

      {/* Orbit ring with a little satellite for the current step */}
      {current && (
        <span className="pointer-events-none absolute rounded-full lp-spin" style={{ inset: -16 }} aria-hidden>
          <span
            className="absolute inset-0 rounded-full border-[1.5px] border-dashed"
            style={{ borderColor: `${palette.accent}99` }}
          />
          <span
            className="absolute left-1/2 top-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: GOLD.base, boxShadow: `0 0 10px ${GOLD.base}` }}
          />
        </span>
      )}

      {inProgress && progress && <ProgressRing size={size} progress={progress} palette={palette} />}

      {/* Locked silhouettes get a hairline outline (clip-path shapes can't use borders) */}
      {locked && (
        <span
          className={cn("pointer-events-none absolute inset-0", shapeClass)}
          style={{ background: "rgba(255,255,255,0.16)" }}
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
          width: locked ? size - 3 : size,
          height: locked ? size - 3 : size,
          background: locked ? "#18224F" : background,
          boxShadow: locked
            ? undefined
            : "inset 0 -6px 12px rgba(0,0,0,0.22), inset 0 3px 6px rgba(255,255,255,0.35)",
        }}
      >
        {/* Specular highlight */}
        {!locked && (
          <span
            className="pointer-events-none absolute left-[22%] top-[14%] h-[22%] w-[34%] rounded-full bg-white/45 blur-[2px]"
            aria-hidden
          />
        )}
        {done && !isChest && !isCheckpoint ? (
          <Check className="relative size-7 text-white drop-shadow" strokeWidth={3.2} />
        ) : learned ? (
          <Dumbbell className="relative size-7 text-white drop-shadow" strokeWidth={2.4} />
        ) : (
          <Icon
            className={cn("relative drop-shadow", isCheckpoint ? "size-9" : current ? "size-8" : "size-6")}
            style={{ color: locked ? "rgba(243,236,254,0.38)" : "#fff" }}
            strokeWidth={2.2}
            fill={node.type === "lesson" && !locked ? "#fff" : "none"}
          />
        )}
      </button>

      {locked && (
        <span className="pointer-events-none absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-[#2A3468] ring-2 ring-[#0D1638]">
          <Lock className="size-2.5 text-[#F3ECFE]/70" strokeWidth={3} />
        </span>
      )}

      {practicePending && progress && (
        <span
          className="pointer-events-none absolute -bottom-7 whitespace-nowrap rounded-full px-2 py-0.5 font-inter text-[10px] font-extrabold text-[#132050]"
          style={{ background: GOLD.base, boxShadow: `0 0 10px ${GOLD.base}88` }}
        >
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
                color: i <= stars ? GOLD.base : "rgba(243,236,254,0.25)",
                fill: i <= stars ? GOLD.base : "transparent",
                filter: i <= stars ? `drop-shadow(0 0 4px ${GOLD.base}AA)` : undefined,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
});
