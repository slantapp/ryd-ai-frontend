import { useMemo } from "react";
import { createPortal } from "react-dom";
import { Flame, Gift, Sparkles, Star, Target, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { CompletionResult } from "../store";
import type { PathNode, UnitPalette } from "../types";
import { GOLD } from "./nodeStyle";

const CONFETTI_COLORS = ["#AA468E", "#DDA5D2", "#F3ECFE", "#0063F7", "#7DB0FF", "#F5C04A", "#C2569F"];

export function Confetti({ count = 90 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 7,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        drift: (Math.random() - 0.5) * 240,
        spin: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720),
        shape: Math.random(),
      })),
    [count],
  );

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="lp-confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.shape > 0.7 ? p.size : p.size * 0.45,
              borderRadius: p.shape > 0.7 ? "9999px" : 2,
              clipPath: p.shape < 0.15 ? "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" : undefined,
              background: p.color,
              "--lp-delay": `${p.delay}s`,
              "--lp-duration": `${p.duration}s`,
              "--lp-drift": `${p.drift}px`,
              "--lp-spin": `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>,
    document.body,
  );
}

export type CelebrationData = {
  node: PathNode;
  palette: UnitPalette;
  stars: number;
  replay: boolean;
  result: CompletionResult;
};

type CelebrationModalProps = {
  data: CelebrationData | null;
  onContinue: () => void;
};

export function CelebrationModal({ data, onContinue }: CelebrationModalProps) {
  const open = data !== null;

  if (!data) return null;
  const { node, palette, stars, result, replay } = data;
  const isChest = node.type === "chest";
  const isCheckpoint = node.type === "checkpoint";
  const HeroIcon = isChest ? Gift : isCheckpoint ? Trophy : Sparkles;
  const golden = isChest || isCheckpoint;

  const heading = isChest
    ? "Treasure unlocked"
    : isCheckpoint
      ? "Checkpoint cleared"
      : stars === 3
        ? "Flawless!"
        : replay
          ? "Sharper than ever"
          : "Step complete";

  return (
    <>
      {open && <Confetti count={isCheckpoint || stars === 3 ? 120 : 70} />}
      <Dialog open={open} onOpenChange={(o) => !o && onContinue()}>
        <DialogContent showCloseButton={false} className="max-w-sm overflow-hidden rounded-[28px] border-0 p-0">
          <div className="lp-sky relative flex flex-col items-center overflow-hidden px-6 pb-7 pt-10 text-center">
            <span
              className="lp-drift pointer-events-none absolute -left-16 -top-20 size-56 rounded-full opacity-50 blur-3xl"
              style={{ background: palette.base }}
              aria-hidden
            />
            <span
              className="lp-drift pointer-events-none absolute -bottom-24 -right-16 size-56 rounded-full bg-[#0063F7] opacity-30 blur-3xl"
              style={{ animationDelay: "-6s" }}
              aria-hidden
            />

            <div className="relative">
              <span
                className="lp-glow absolute -inset-5 rounded-full blur-2xl"
                style={{ background: golden ? GOLD.base : palette.base }}
                aria-hidden
              />
              <span className="lp-spin absolute -inset-4 rounded-full border-[1.5px] border-dashed border-[#F3ECFE]/40" aria-hidden />
              <div
                className="lp-pop relative flex size-24 items-center justify-center rounded-full"
                style={{
                  background: golden
                    ? `radial-gradient(circle at 32% 26%, ${GOLD.light}, ${GOLD.base} 50%, ${GOLD.deep})`
                    : `radial-gradient(circle at 32% 26%, ${palette.accent}, ${palette.base} 50%, ${palette.shade})`,
                  boxShadow: "inset 0 -8px 16px rgba(0,0,0,0.25), inset 0 4px 8px rgba(255,255,255,0.4)",
                }}
              >
                <HeroIcon className="size-11 text-white drop-shadow" strokeWidth={2} />
              </div>
            </div>

            {!isChest && (
              <div className="mt-6 flex items-end gap-2" aria-label={`${stars} of 3 stars`}>
                {[1, 2, 3].map((i) => (
                  <Star
                    key={i}
                    className={i === 2 ? "lp-pop size-11" : "lp-pop size-8"}
                    style={{
                      animationDelay: `${0.25 + i * 0.18}s`,
                      color: i <= stars ? GOLD.base : "rgba(243,236,254,0.25)",
                      fill: i <= stars ? GOLD.base : "transparent",
                      filter: i <= stars ? `drop-shadow(0 0 10px ${GOLD.base})` : undefined,
                    }}
                    strokeWidth={1.6}
                  />
                ))}
              </div>
            )}

            <DialogTitle className="relative mt-4 font-solway text-2xl font-bold text-white">{heading}</DialogTitle>
            <DialogDescription className="relative mt-1 font-inter text-sm text-[#F3ECFE]/70">
              {node.title}
            </DialogDescription>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-white p-5">
            <StatTile
              icon={<Star className="size-5" fill="currentColor" />}
              color="#AA468E"
              tint="#F3ECFE"
              label="Stars"
              value={`${stars} / 3`}
            />
            <StatTile
              icon={<Flame className={result.streakExtended ? "lp-flicker size-5" : "size-5"} fill="currentColor" />}
              color="#0063F7"
              tint="#E6F0FF"
              label={result.streakExtended ? "Streak extended" : "Day streak"}
              value={`${result.streak}`}
            />
            {result.dailyGoalReached && (
              <div
                className="lp-rise col-span-2 flex items-center gap-3 rounded-2xl bg-[#132050] px-4 py-3 text-left"
                style={{ animationDelay: "0.6s" }}
              >
                <Target className="size-5 shrink-0" style={{ color: GOLD.base }} />
                <p className="font-inter text-sm font-semibold text-white">Daily goal reached — brilliant work!</p>
              </div>
            )}

            <button
              type="button"
              onClick={onContinue}
              autoFocus
              className="col-span-2 mt-1 h-12 rounded-2xl font-solway text-sm font-bold text-white transition-all duration-200 hover:shadow-[0_12px_28px_-10px_#AA468E] active:scale-[0.98]"
              style={{ background: "linear-gradient(120deg, #AA468E 0%, #7E2F68 100%)" }}
            >
              Continue the journey
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatTile({
  icon,
  color,
  tint,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: string;
  tint: string;
  label: string;
  value: string;
}) {
  return (
    <div
      className="lp-rise flex flex-col items-center rounded-2xl px-3 py-3"
      style={{ background: tint, animationDelay: "0.35s" }}
    >
      <span className="flex items-center gap-1.5 font-solway text-2xl font-bold tabular-nums" style={{ color }}>
        {icon}
        {value}
      </span>
      <span className="mt-0.5 font-inter text-xs font-semibold text-[#4F4D55]">{label}</span>
    </div>
  );
}
