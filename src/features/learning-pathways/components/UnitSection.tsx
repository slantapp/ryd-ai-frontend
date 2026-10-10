import type { RefCallback } from "react";
import { BookOpen, ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PathNodeState, PathUnit } from "../types";
import { waveOffset } from "../progress";
import { PathNode } from "./PathNode";
import type { LessonProgress } from "../lessonProgress";
import { NodePopover } from "./NodePopover";
import { NODE_LABELS } from "./icons";
import { GOLD } from "./nodeStyle";

const ROW = 124;
const ROW_H = 100;
const STEP_X = 62;

/** Deterministic sparkle positions so stars don't jump between renders. */
const SPARKLES = [
  { x: 8, y: 0.12, s: 3 },
  { x: 88, y: 0.22, s: 2 },
  { x: 14, y: 0.48, s: 2 },
  { x: 93, y: 0.6, s: 3 },
  { x: 6, y: 0.8, s: 2 },
  { x: 84, y: 0.9, s: 2 },
];

type UnitSectionProps = {
  unit: PathUnit;
  unitNumber: number;
  states: Record<string, PathNodeState>;
  stars: Record<string, number>;
  openNodeId: string | null;
  startingNodeId: string | null;
  justUnlockedId: string | null;
  nodeRef: (nodeId: string) => RefCallback<HTMLButtonElement>;
  onToggleNode: (nodeId: string) => void;
  onStartNode: (nodeId: string) => void;
  onOpenGuide: (unit: PathUnit) => void;
  /** Lesson-level progress (learn / practice) per node. */
  progressByNode?: Record<string, LessonProgress>;
  /** The single "up next" lesson on the whole path. */
  upNextNodeId?: string | null;
  /** 0..100 course progress shown in the banner. */
  percent?: number;
  /** Show only the first few lessons until expanded (courses not started yet). */
  collapsed?: boolean;
  onExpand?: () => void;
};

/** Lessons shown for a collapsed (not started) course. */
const COLLAPSED_COUNT = 3;
/** Above this many lessons the banner shows a progress bar instead of one dot per lesson. */
const MAX_DOTS = 12;

export function UnitSection({
  unit,
  unitNumber,
  states,
  stars,
  openNodeId,
  startingNodeId,
  justUnlockedId,
  nodeRef,
  onToggleNode,
  onStartNode,
  onOpenGuide,
  progressByNode,
  upNextNodeId,
  percent,
  collapsed = false,
  onExpand,
}: UnitSectionProps) {
  const { palette } = unit;
  const doneCount = unit.nodes.filter((n) => states[n.id] === "completed").length;
  const unitLocked = unit.nodes.every((n) => states[n.id] === "locked");
  const gradientId = `lp-trail-${unit.id}`;
  const hiddenCount = collapsed ? Math.max(0, unit.nodes.length - COLLAPSED_COUNT) : 0;
  const nodes = hiddenCount > 0 ? unit.nodes.slice(0, COLLAPSED_COUNT) : unit.nodes;

  const points = nodes.map((_, i) => ({ x: waveOffset(i) * STEP_X, y: i * ROW + ROW_H / 2 }));
  const height = (nodes.length - 1) * ROW + ROW_H;
  const planetSide = unitNumber % 2 === 0 ? "left" : "right";

  return (
    <section aria-label={`Chapter ${unitNumber}: ${unit.title}`} className="relative">
      {/* Chapter header */}
      <header className={cn("relative flex flex-col items-center px-4 text-center", unitLocked && "opacity-60")}>
        <span
          className="lp-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-inter text-[10px] font-bold uppercase tracking-[0.22em]"
          style={{ color: palette.accent }}
        >
          {unitLocked && <Lock className="size-3" />}
          {unit.sectionTitle ?? `Chapter ${String(unitNumber).padStart(2, "0")}`}
        </span>
        <h2 className="mt-3 font-solway text-2xl font-bold text-white sm:text-[28px]">{unit.title}</h2>
        <p className="mt-1.5 max-w-sm font-inter text-sm leading-relaxed text-[#F3ECFE]/65">{unit.description}</p>

        <div className="mt-4 flex items-center gap-3">
          {unit.nodes.length > MAX_DOTS ? (
            <div className="flex items-center gap-2" aria-label={`${doneCount} of ${unit.nodes.length} lessons done`}>
              <div className="h-2 w-36 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${percent ?? Math.round((doneCount / unit.nodes.length) * 100)}%`, background: `linear-gradient(90deg, ${palette.accent}, ${palette.base})` }}
                />
              </div>
              <span className="font-inter text-xs font-semibold text-[#F3ECFE]/80">
                {doneCount}/{unit.nodes.length} lessons
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5" aria-label={`${doneCount} of ${unit.nodes.length} lessons done`}>
              {unit.nodes.map((n) => {
                const s = states[n.id];
                const up = n.id === upNextNodeId;
                return (
                  <span
                    key={n.id}
                    className={cn("rounded-full transition-all duration-500", up ? "h-2 w-5" : "size-2")}
                    style={{
                      background:
                        s === "locked" ? "rgba(243,236,254,0.18)"
                          : up ? GOLD.base
                            : s === "learned" ? `${GOLD.base}AA`
                              : s === "current" ? `${palette.accent}88`
                                : palette.accent,
                      boxShadow: up ? `0 0 10px ${GOLD.base}` : undefined,
                    }}
                  />
                );
              })}
            </div>
          )}
          {typeof percent === "number" && unit.nodes.length <= MAX_DOTS && (
            <span className="font-inter text-xs font-semibold text-[#F3ECFE]/80">{percent}%</span>
          )}
          {!unitLocked && (
            <button
              type="button"
              onClick={() => onOpenGuide(unit)}
              className="lp-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-inter text-xs font-semibold text-[#F3ECFE] transition-colors hover:bg-white/15"
            >
              <BookOpen className="size-3.5" />
              Guide
            </button>
          )}
        </div>
      </header>

      {/* The trail */}
      <div className="relative mx-auto mt-10 w-full max-w-[460px]" style={{ height }}>
        {/* Background sparkles & a planet for depth */}
        {SPARKLES.map((sp, i) => (
          <span
            key={i}
            className="lp-twinkle pointer-events-none absolute rounded-full bg-white"
            style={{
              left: `${sp.x}%`,
              top: sp.y * height,
              width: sp.s,
              height: sp.s,
              animationDelay: `${i * 0.7}s`,
              boxShadow: `0 0 6px ${palette.accent}`,
            }}
            aria-hidden
          />
        ))}
        <Planet side={planetSide} top={height * 0.35} palette={palette} dim={unitLocked} />

        <svg
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 overflow-visible"
          width={400}
          height={height}
          viewBox={`-200 0 400 ${height}`}
          aria-hidden
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={palette.accent} />
              <stop offset="100%" stopColor={palette.base} />
            </linearGradient>
          </defs>
          {points.slice(1).map((p, i) => {
            const a = points[i];
            const midY = (a.y + p.y) / 2;
            const d = `M ${a.x} ${a.y} C ${a.x} ${midY} ${p.x} ${midY} ${p.x} ${p.y}`;
            const target = states[nodes[i + 1].id];
            if (target === "locked") {
              return (
                <path key={i} d={d} fill="none" stroke="#F3ECFE" strokeOpacity={0.22} strokeWidth={2.5} strokeLinecap="round" strokeDasharray="1 10" />
              );
            }
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={palette.base} strokeOpacity={0.45} strokeWidth={12} strokeLinecap="round" style={{ filter: "blur(6px)" }} />
                <path
                  d={d}
                  fill="none"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeDasharray={target === "current" || target === "learned" ? "14 10" : undefined}
                  className={target === "current" || target === "learned" ? "lp-trail-flow" : undefined}
                />
              </g>
            );
          })}
        </svg>

        {nodes.map((node, i) => {
          const offset = waveOffset(i) * STEP_X;
          const state = states[node.id];
          const open = openNodeId === node.id;
          const upNext = upNextNodeId === undefined ? state === "current" : node.id === upNextNodeId;
          const progress = progressByNode?.[node.id];
          // Labels face the centre so they stay on-canvas; hidden on phones (the popover covers it).
          const labelLeft = offset > 0;
          return (
            <div
              key={node.id}
              data-lp-row
              className={cn("absolute inset-x-0 flex items-center justify-center", open ? "z-30" : "z-10")}
              style={{ top: i * ROW, height: ROW_H }}
            >
              <div className="relative" style={{ transform: `translateX(${offset}px)` }}>
                <PathNode
                  ref={nodeRef(node.id)}
                  node={node}
                  state={state}
                  palette={palette}
                  stars={stars[node.id] ?? 0}
                  open={open}
                  justUnlocked={justUnlockedId === node.id}
                  upNext={upNext}
                  progress={progress}
                  onToggle={() => onToggleNode(node.id)}
                />
                <NodeLabel
                  title={node.title}
                  kind={node.kindLabel ?? NODE_LABELS[node.type]}
                  minutes={node.type === "chest" ? null : node.minutes}
                  state={state}
                  upNext={upNext}
                  accent={palette.accent}
                  side={labelLeft ? "left" : "right"}
                  gap={upNext ? 26 : 14}
                />
              </div>
              {open && (
                <NodePopover
                  node={node}
                  state={state}
                  palette={palette}
                  arrowOffset={offset}
                  starting={startingNodeId === node.id}
                  progress={progress}
                  onStart={() => onStartNode(node.id)}
                />
              )}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onExpand}
            className="lp-glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 font-inter text-xs font-semibold text-[#F3ECFE] transition-colors hover:bg-white/15"
          >
            <ChevronDown className="size-3.5" />
            Show all {unit.nodes.length} lessons
          </button>
        </div>
      )}
    </section>
  );
}

function NodeLabel({
  title,
  kind,
  minutes,
  state,
  upNext,
  accent,
  side,
  gap,
}: {
  title: string;
  kind: string;
  minutes: number | null;
  state: PathNodeState;
  upNext: boolean;
  accent: string;
  side: "left" | "right";
  gap: number;
}) {
  const current = upNext;
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-1/2 w-[150px] -translate-y-1/2 max-sm:hidden",
        side === "left" ? "text-right" : "text-left",
      )}
      style={side === "left" ? { right: `calc(100% + ${gap}px)` } : { left: `calc(100% + ${gap}px)` }}
    >
      {current && (
        <span
          className="mb-1 inline-block rounded-full px-2 py-0.5 font-inter text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#132050]"
          style={{ background: GOLD.base, boxShadow: `0 0 12px ${GOLD.base}88` }}
        >
          Up next
        </span>
      )}
      {!current && state === "learned" && (
        <span className="mb-1 inline-block rounded-full border border-[#F5C04A]/70 px-2 py-0.5 font-inter text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#F5C04A]">
          Practice pending
        </span>
      )}
      <p
        className="font-inter text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: state === "locked" ? "rgba(243,236,254,0.3)" : accent }}
      >
        {kind}
        {minutes ? ` · ${minutes}m` : ""}
      </p>
      <p
        className={cn(
          "mt-0.5 font-solway leading-snug",
          current ? "text-[15px] font-bold text-white" : "text-[13px] font-semibold",
          state === "completed" && "text-[#F3ECFE]/80",
          state === "locked" && "text-[#F3ECFE]/40",
        )}
      >
        {title}
      </p>
    </div>
  );
}

function Planet({
  side,
  top,
  palette,
  dim,
}: {
  side: "left" | "right";
  top: number;
  palette: PathUnit["palette"];
  dim: boolean;
}) {
  return (
    <div
      className={cn("pointer-events-none absolute hidden md:block", dim && "opacity-40")}
      style={{ top, [side]: -150 }}
      aria-hidden
    >
      <div className="lp-float relative size-24">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 28%, ${palette.accent} 0%, ${palette.base} 55%, ${palette.shade} 100%)`,
            boxShadow: `0 0 40px ${palette.base}66`,
          }}
        />
        <span
          className="absolute left-1/2 top-1/2 h-7 w-40 -translate-x-1/2 -translate-y-1/2 -rotate-[18deg] rounded-[50%] border-2"
          style={{ borderColor: `${palette.accent}88` }}
        />
        <span className="absolute left-[24%] top-[30%] size-3 rounded-full bg-white/25" />
        <span className="absolute left-[55%] top-[58%] size-2 rounded-full bg-black/15" />
      </div>
    </div>
  );
}
