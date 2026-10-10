import { Flame, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningStats } from "@/api/learningStats";
import type { Badge } from "../types";
import { BADGE_ICONS } from "./icons";
import { GOLD } from "./nodeStyle";

const PLUM = "#AA468E";

/** "2026-10-08" -> one-letter weekday ("T"), using the date itself (no timezone shift). */
function weekdayLetter(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "narrow", timeZone: "UTC" });
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[22px] border border-[#EDEAF3] bg-white p-5 shadow-[0_1px_2px_rgba(19,32,80,0.04)]", className)}>
      {children}
    </div>
  );
}

function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="font-solway text-base font-bold text-[#0A090B]">{children}</h3>
      {action}
    </div>
  );
}

/** Streak from the server: days with a finished lesson or at least 5 minutes of learning. */
export function StreakCard({ stats }: { stats: LearningStats | null }) {
  const streak = stats?.streak ?? 0;
  const activeToday = !!stats?.activeToday;
  const days = stats?.last7Days ?? [];
  const todayDate = stats?.today.day;

  return (
    <div className="lp-sky relative overflow-hidden rounded-[22px] p-5 text-white">
      <span className="lp-drift pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-[#AA468E] opacity-50 blur-3xl" aria-hidden />
      <div className="relative flex items-center gap-4">
        <div className="relative flex size-14 items-center justify-center">
          <span className="lp-glow absolute inset-0 rounded-full bg-[#AA468E] blur-lg" aria-hidden />
          <Flame className={cn("relative size-10", streak > 0 && "lp-flicker")} fill="#DDA5D2" color="#F3ECFE" strokeWidth={1.6} />
        </div>
        <div>
          <p className="font-solway text-4xl font-bold leading-none tabular-nums">{streak}</p>
          <p className="mt-1 font-inter text-xs font-semibold uppercase tracking-[0.14em] text-[#F3ECFE]/70">
            day streak{stats && stats.longestStreak > streak ? ` · best ${stats.longestStreak}` : ""}
          </p>
        </div>
      </div>
      <p className="relative mt-4 font-inter text-sm text-[#F3ECFE]/80">
        {activeToday
          ? "Your flame is lit for today. See you tomorrow ✦"
          : "Finish a lesson (or learn for 5 minutes) today to keep your flame glowing."}
      </p>
      <div className="relative mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const isTodayCell = d.date === todayDate;
          return (
            <div key={d.date} className="flex flex-col items-center gap-1.5" title={`${d.date}: ${d.lessons} lesson(s), ${d.minutes} min`}>
              <span className={cn("font-inter text-[10px] font-bold", isTodayCell ? "text-white" : "text-[#F3ECFE]/50")}>{weekdayLetter(d.date)}</span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  !d.active && "bg-white/10",
                  isTodayCell && !d.active && "ring-1 ring-[#DDA5D2]/70",
                )}
                style={d.active ? { background: "linear-gradient(135deg, #DDA5D2, #AA468E)", boxShadow: "0 0 12px #AA468E99" } : undefined}
              >
                {d.active && <Flame className="size-3.5 text-white" fill="currentColor" />}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Lessons finished today (all courses) against the daily goal. */
export function DailyGoalCard({ stats }: { stats: LearningStats | null }) {
  const goal = stats?.today.goal ?? 3;
  const lessonsToday = stats?.today.lessonsCompleted ?? 0;
  const pct = Math.min(1, lessonsToday / goal);
  const left = Math.max(0, goal - lessonsToday);
  const r = 30;
  const c = 2 * Math.PI * r;

  return (
    <Card>
      <CardTitle>Daily goal</CardTitle>
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
            <defs>
              <linearGradient id="lp-goal" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#DDA5D2" />
                <stop offset="100%" stopColor={PLUM} />
              </linearGradient>
            </defs>
            <circle cx="40" cy="40" r={r} fill="none" stroke="#F3ECFE" strokeWidth="9" />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="url(#lp-goal)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              className="transition-[stroke-dashoffset] duration-1000 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center">
            {pct >= 1 ? (
              <Target className="size-7" style={{ color: GOLD.deep }} />
            ) : (
              <Sparkles className="size-7" style={{ color: PLUM }} />
            )}
          </span>
        </div>
        <div>
          <p className="font-solway text-2xl font-bold tabular-nums text-[#0A090B]">
            {lessonsToday}
            <span className="text-base font-semibold text-[#9C96A8]"> / {goal} lessons</span>
          </p>
          <p className="mt-0.5 font-inter text-xs text-[#4F4D55]">
            {pct >= 1
              ? "Goal reached — anything extra is a bonus."
              : `${left} more lesson${left === 1 ? "" : "s"} to reach today's goal`}
          </p>
          {stats && stats.today.minutes > 0 && (
            <p className="mt-0.5 font-inter text-xs text-[#9C96A8]">{stats.today.minutes} min of learning today</p>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Badges earned from real activity (server) plus the path "Graduate" badge (client). */
export function BadgesCard({ badges }: { badges: Badge[] }) {
  return (
    <Card>
      <CardTitle>Badges</CardTitle>
      <div className="grid grid-cols-3 gap-3">
        {badges.map((b) => {
          const Icon = BADGE_ICONS[b.icon];
          return (
            <div key={b.id} className="group flex flex-col items-center text-center" title={b.description}>
              <div
                className={cn(
                  "relative flex size-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-1",
                  b.unlocked ? "lp-shine" : "border border-dashed border-[#DDB5D2] bg-[#FBF9FE]",
                )}
                style={
                  b.unlocked
                    ? { background: "linear-gradient(140deg, #132050 0%, #AA468E 100%)", boxShadow: "0 8px 18px -8px #AA468E" }
                    : undefined
                }
              >
                <Icon className={cn("size-6", b.unlocked ? "text-white" : "text-[#DDB5D2]")} strokeWidth={2} />
                {b.unlocked && (
                  <span className="absolute -right-1 -top-1 size-3 rounded-full ring-2 ring-white" style={{ background: GOLD.base }} />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 font-inter text-[11px] font-semibold leading-tight",
                  b.unlocked ? "text-[#0A090B]" : "text-[#9C96A8]",
                )}
              >
                {b.title}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Compact streak chip used in the page header. */
export function StatChips({ stats }: { stats: LearningStats | null }) {
  const streak = stats?.streak ?? 0;
  return (
    <div className="flex items-center gap-2">
      <Chip title={`${streak} day streak`}>
        <Flame className={cn("size-4.5", stats?.activeToday && "lp-flicker")} color={PLUM} fill={streak > 0 ? "#DDA5D2" : "none"} />
        <span className="text-[#AA468E]">{streak}</span>
        <span className="font-inter text-xs font-semibold text-[#9C96A8]">day streak</span>
      </Chip>
    </div>
  );
}

function Chip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <span
      title={title}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#EDEAF3] bg-white px-3.5 font-solway text-sm font-bold tabular-nums shadow-[0_1px_2px_rgba(19,32,80,0.04)]"
    >
      {children}
    </span>
  );
}
