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
import { PASTEL_CYCLE } from "../palettes";

const ROW = 124;
const ROW_H = 100;
const STEP_X = 62;

type UnitSectionProps = {
  unit: PathUnit;
  /** Position on the page (not shown; units are labelled "Unit N" from the data). */
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
  // Each "Unit N" chip gets its own soft pastel so chapters feel distinct.
  const chipTone = PASTEL_CYCLE[(unitNumber - 1) % PASTEL_CYCLE.length];
  const doneCount = unit.nodes.filter((n) => states[n.id] === "completed").length;
  const unitLocked = unit.nodes.every((n) => states[n.id] === "locked");
  const hiddenCount = collapsed ? Math.max(0, unit.nodes.length - COLLAPSED_COUNT) : 0;
  const nodes = hiddenCount > 0 ? unit.nodes.slice(0, COLLAPSED_COUNT) : unit.nodes;

  const points = nodes.map((_, i) => ({ x: waveOffset(i) * STEP_X, y: i * ROW + ROW_H / 2 }));
  const height = (nodes.length - 1) * ROW + ROW_H;

  return (
    <section aria-label={unit.sectionTitle ? `${unit.sectionTitle}: ${unit.title}` : unit.title} className="relative">
      {/* Chapter header */}
      <header className={cn("relative flex flex-col items-center px-4 text-center", unitLocked && "opacity-60")}>
        {/* "Unit N" only on the first course of each unit, so it isn't repeated. */}
        {unit.sectionTitle && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-inter text-[10px] font-bold uppercase tracking-[0.22em] shadow-[0_3px_10px_-6px_rgba(170,70,142,0.35)]"
            style={{ background: chipTone.tint, color: chipTone.ink, borderColor: chipTone.line }}
          >
            {unitLocked && <Lock className="size-3" />}
            {unit.sectionTitle}
          </span>
        )}
        <h2 className="mt-3 font-solway text-2xl font-bold text-[#132050] sm:text-[28px]">{unit.title}</h2>
        <p className="mt-1.5 max-w-sm font-inter text-sm leading-relaxed text-[#5C5468]">{unit.description}</p>

        <div className="mt-4 flex items-center gap-3">
          {unit.nodes.length > MAX_DOTS ? (
            <div className="flex items-center gap-2" aria-label={`${doneCount} of ${unit.nodes.length} lessons done`}>
              <div className="h-2.5 w-36 overflow-hidden rounded-full bg-[#F3ECFE]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${percent ?? Math.round((doneCount / unit.nodes.length) * 100)}%`, background: palette.base }}
                />
              </div>
              <span className="font-inter text-xs font-semibold text-[#5C5468]">
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
                    className={cn("rounded-full transition-all duration-500", up ? "h-2.5 w-6" : "size-2.5")}
                    style={{
                      background:
                        s === "locked" ? "#E1DFE8"
                          : up ? palette.base
                            : s === "learned" ? GOLD.base
                              : s === "current" ? `${palette.base}66`
                                : palette.base,
                    }}
                  />
                );
              })}
            </div>
          )}
          {typeof percent === "number" && unit.nodes.length <= MAX_DOTS && (
            <span className="font-inter text-xs font-semibold text-[#5C5468]">{percent}%</span>
          )}
          {!unitLocked && (
            <button
              type="button"
              onClick={() => onOpenGuide(unit)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E4D9FB] bg-[#FAF5FF] px-3 py-1.5 font-inter text-xs font-semibold text-[#132050] shadow-[0_3px_10px_-6px_rgba(106,85,216,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#F3ECFE]"
            >
              <BookOpen className="size-3.5 text-[#6A55D8]" />
              Guide
            </button>
          )}
        </div>
      </header>

      {/* The trail */}
      <div className="relative mx-auto mt-10 w-full max-w-[460px]" style={{ height }}>
        <svg
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 overflow-visible"
          width={400}
          height={height}
          viewBox={`-200 0 400 ${height}`}
          aria-hidden
        >
          {points.slice(1).map((p, i) => {
            const a = points[i];
            const midY = (a.y + p.y) / 2;
            const d = `M ${a.x} ${a.y} C ${a.x} ${midY} ${p.x} ${midY} ${p.x} ${p.y}`;
            const target = states[nodes[i + 1].id];
            if (target === "locked") {
              return (
                <path key={i} d={d} fill="none" stroke="#D6D3DF" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="1 10" />
              );
            }
            const inProgress = target === "current" || target === "learned";
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={palette.base}
                strokeOpacity={inProgress ? 0.45 : 0.7}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={inProgress ? "10 8" : undefined}
              />
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
                  accent={palette.base}
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
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EADCE8] bg-white px-4 py-2 font-inter text-xs font-semibold text-[#132050] shadow-[0_4px_14px_-8px_rgba(170,70,142,0.4)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FAF5FB]"
          >
            <ChevronDown className="size-3.5 text-[#AA468E]" />
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
          className="mb-1 inline-block rounded-full px-2.5 py-0.5 font-inter text-[9px] font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_3px_8px_-3px_rgba(170,70,142,0.5)]"
          style={{ background: accent }}
        >
          Up next
        </span>
      )}
      {!current && state === "learned" && (
        <span className="mb-1 inline-block rounded-full border border-[#F5C04A] bg-[#FDF3DC] px-2 py-0.5 font-inter text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#8A5A00]">
          Practice pending
        </span>
      )}
      <p
        className="font-inter text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: state === "locked" ? "#5C5468" : accent }}
      >
        {kind}
        {minutes ? ` · ${minutes}m` : ""}
      </p>
      <p
        className={cn(
          "mt-0.5 font-solway leading-snug text-[#132050]",
          current ? "text-[15px] font-bold" : "text-[13px] font-semibold",
          state === "completed" && "text-[#5C5468]",
          state === "locked" && "font-medium text-[#5C5468]",
        )}
      >
        {title}
      </p>
    </div>
  );
}
