import { Flame, Sparkles, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningStats } from "@/api/learningStats";
import type { Badge } from "../types";
import { BADGE_ICONS } from "./icons";
import { GOLD } from "./nodeStyle";
import { PASTEL_CYCLE, PASTELS } from "../palettes";

/** "2026-10-08" -> one-letter weekday ("T"), using the date itself (no timezone shift). */
function weekdayLetter(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "narrow", timeZone: "UTC" });
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[#EADCE8] bg-white p-5 shadow-[0_6px_20px_-8px_rgba(170,70,142,0.22)] transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h3 className="font-solway text-base font-bold text-[#132050]">{children}</h3>
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
    <Card className="relative border-[#FBD9B5] bg-linear-to-br from-[#FFF7ED] via-white to-white shadow-[0_6px_20px_-8px_rgba(234,88,12,0.22)]">
      <div className="relative flex items-center gap-4">
        <div className="relative flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-[#FEF3C7] to-[#FFEDD5] ring-1 ring-[#FBD9B5]">
          <Flame className="relative size-9" fill={streak > 0 ? "#FDBA74" : "none"} color="#C2410C" strokeWidth={1.8} />
        </div>
        <div>
          <p className="font-solway text-4xl font-bold leading-none tabular-nums text-[#132050]">{streak}</p>
          <p className="mt-1 font-inter text-xs font-semibold uppercase tracking-[0.14em] text-[#9A3412]">
            day streak{stats && stats.longestStreak > streak ? ` · best ${stats.longestStreak}` : ""}
          </p>
        </div>
      </div>
      <p className="relative mt-4 font-inter text-sm text-[#5C5468]">
        {activeToday
          ? "Your flame is lit for today. See you tomorrow ✦"
          : "Finish a lesson (or learn for 5 minutes) today to keep your flame glowing."}
      </p>
      <div className="relative mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const isTodayCell = d.date === todayDate;
          return (
            <div key={d.date} className="flex flex-col items-center gap-1.5" title={`${d.date}: ${d.lessons} lesson(s), ${d.minutes} min`}>
              <span className={cn("font-inter text-[10px] font-bold", isTodayCell ? "text-[#132050]" : "text-[#736A80]")}>{weekdayLetter(d.date)}</span>
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full",
                  d.active ? "bg-linear-to-b from-[#FEF3C7] to-[#FED7AA] ring-1 ring-[#FDBA74]" : "bg-[#F4EEF5]",
                  isTodayCell && !d.active && "ring-2 ring-[#FDBA74]",
                )}
              >
                {d.active && <Flame className="size-4 text-[#C2410C]" fill="#FB923C" />}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
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
    <Card className="border-[#C3EFD3] bg-linear-to-br from-[#F0FDF4] via-white to-white shadow-[0_6px_20px_-8px_rgba(22,101,52,0.18)]">
      <CardTitle>Daily goal</CardTitle>
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="#DCFCE7" strokeWidth="9" />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="#22A55B"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
              className="transition-[stroke-dashoffset] duration-1000 ease-out"
            />
          </svg>
          <span className="absolute inset-[18px] flex items-center justify-center rounded-full bg-white">
            {pct >= 1 ? (
              <Target className="size-7" style={{ color: GOLD.deep }} />
            ) : (
              <Sparkles className="size-7" style={{ color: PASTELS.mint.ink }} />
            )}
          </span>
        </div>
        <div>
          <p className="font-solway text-2xl font-bold tabular-nums text-[#132050]">
            {lessonsToday}
            <span className="text-base font-semibold text-[#736A80]"> / {goal} lessons</span>
          </p>
          <p className="mt-0.5 font-inter text-xs font-medium text-[#166534]">
            {pct >= 1
              ? "Goal reached — anything extra is a bonus."
              : `${left} more lesson${left === 1 ? "" : "s"} to reach today's goal`}
          </p>
          {stats && stats.today.minutes > 0 && (
            <p className="mt-0.5 font-inter text-xs text-[#736A80]">{stats.today.minutes} min of learning today</p>
          )}
        </div>
      </div>
    </Card>
  );
}

/** Badges earned from real activity (server) plus the path "Graduate" badge (client). */
export function BadgesCard({ badges }: { badges: Badge[] }) {
  return (
    <Card className="border-[#E4D9FB] bg-linear-to-br from-[#FAF5FF] via-white to-white shadow-[0_6px_20px_-8px_rgba(106,85,216,0.2)]">
      <CardTitle>Badges</CardTitle>
      <div className="grid grid-cols-3 gap-3">
        {badges.map((b, i) => {
          const Icon = BADGE_ICONS[b.icon];
          const tone = PASTEL_CYCLE[i % PASTEL_CYCLE.length];
          return (
            <div key={b.id} className="group flex flex-col items-center text-center" title={b.description}>
              <div
                className={cn(
                  "relative flex size-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5",
                  b.unlocked
                    ? "shadow-[0_4px_10px_-4px_rgba(170,70,142,0.25)] ring-1"
                    : "border border-dashed border-[#D6D3DF] bg-[#F4EEF5]/60",
                )}
                style={
                  b.unlocked
                    ? ({ background: tone.tint, color: tone.ink, "--tw-ring-color": tone.line } as React.CSSProperties)
                    : undefined
                }
              >
                <Icon className={cn("size-7", !b.unlocked && "text-[#A8A3B5]")} strokeWidth={2} />
                {b.unlocked && (
                  <span className="absolute -right-1 -top-1 size-3 rounded-full ring-2 ring-white" style={{ background: GOLD.base }} />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 font-inter text-[11px] font-semibold leading-tight",
                  b.unlocked ? "text-[#132050]" : "text-[#736A80]",
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
        <Flame className="size-5" color="#C2410C" fill={streak > 0 ? "#FDBA74" : "none"} />
        <span className="text-[#9A3412]">{streak}</span>
        <span className="font-inter text-xs font-semibold text-[#9A3412]">day streak</span>
      </Chip>
    </div>
  );
}

function Chip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <span
      title={title}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#FBD9B5] bg-linear-to-r from-[#FFEDD5] to-[#FEF3C7] px-4 font-solway text-sm font-bold tabular-nums shadow-[0_4px_14px_-6px_rgba(234,88,12,0.3)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      {children}
    </span>
  );
}
