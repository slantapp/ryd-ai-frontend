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
        <DialogContent
          showCloseButton={false}
          className="max-w-sm gap-0 overflow-hidden rounded-[28px] border border-[#E7E5EE] bg-white p-0 shadow-lg"
        >
          <div
            className="relative flex flex-col items-center border-t-4 px-6 pb-6 pt-9 text-center"
            style={{ borderTopColor: palette.base }}
          >
            <div className="relative">
              <div
                className="lp-pop relative flex size-24 items-center justify-center rounded-full"
                style={{ background: golden ? "#FDF3DC" : palette.soft }}
              >
                <HeroIcon className="size-11" style={{ color: golden ? GOLD.deep : palette.base }} strokeWidth={2} />
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
                      color: i <= stars ? GOLD.base : "#D6D3DF",
                      fill: i <= stars ? GOLD.base : "transparent",
                    }}
                    strokeWidth={1.6}
                  />
                ))}
              </div>
            )}

            <DialogTitle className="relative mt-4 font-solway text-2xl font-bold text-[#132050]">{heading}</DialogTitle>
            <DialogDescription className="relative mt-1 font-inter text-sm text-[#5B6478]">
              {node.title}
            </DialogDescription>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#F0EEF4] bg-white p-5">
            <StatTile
              icon={<Star className="size-5" fill="currentColor" />}
              color="#AA468E"
              tint="#F3ECFE"
              label="Stars"
              value={`${stars} / 3`}
            />
            <StatTile
              icon={<Flame className="size-5" fill="currentColor" />}
              color="#0063F7"
              tint="#E6F0FF"
              label={result.streakExtended ? "Streak extended" : "Day streak"}
              value={`${result.streak}`}
            />
            {result.dailyGoalReached && (
              <div
                className="lp-rise col-span-2 flex items-center gap-3 rounded-2xl border border-[#F5C04A]/60 bg-[#FDF3DC] px-4 py-3 text-left"
                style={{ animationDelay: "0.6s" }}
              >
                <Target className="size-5 shrink-0" style={{ color: GOLD.deep }} />
                <p className="font-inter text-sm font-semibold text-[#132050]">Daily goal reached — brilliant work!</p>
              </div>
            )}

            <button
              type="button"
              onClick={onContinue}
              autoFocus
              className="col-span-2 mt-1 h-12 rounded-2xl bg-(--lp-cta) font-solway text-sm font-bold text-white transition-colors duration-200 hover:bg-(--lp-cta-hover) active:scale-[0.98]"
              style={{ "--lp-cta": palette.base, "--lp-cta-hover": palette.shade } as React.CSSProperties}
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
      <span className="mt-0.5 font-inter text-xs font-semibold text-[#5B6478]">{label}</span>
    </div>
  );
}
