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
    <div className={cn("rounded-[22px] border border-[#EADCE8] bg-white p-5 shadow-sm", className)}>
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
    <Card className="relative">
      <div className="relative flex items-center gap-4">
        <div className="relative flex size-14 items-center justify-center rounded-2xl bg-[#F8EAF3]">
          <Flame className="relative size-8" fill={streak > 0 ? "#DDA5D2" : "none"} color={PLUM} strokeWidth={1.8} />
        </div>
        <div>
          <p className="font-solway text-4xl font-bold leading-none tabular-nums text-[#132050]">{streak}</p>
          <p className="mt-1 font-inter text-xs font-semibold uppercase tracking-[0.14em] text-[#5C5468]">
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
                  !d.active && "bg-[#F4EEF5]",
                  isTodayCell && !d.active && "ring-1 ring-[#AA468E]/60",
                )}
                style={d.active ? { background: PLUM } : undefined}
              >
                {d.active && <Flame className="size-3.5 text-white" fill="currentColor" />}
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
    <Card>
      <CardTitle>Daily goal</CardTitle>
      <div className="flex items-center gap-4">
        <div className="relative size-20 shrink-0">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90">
            <circle cx="40" cy="40" r={r} fill="none" stroke="#F8EAF3" strokeWidth="9" />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke={PLUM}
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
          <p className="font-solway text-2xl font-bold tabular-nums text-[#132050]">
            {lessonsToday}
            <span className="text-base font-semibold text-[#736A80]"> / {goal} lessons</span>
          </p>
          <p className="mt-0.5 font-inter text-xs text-[#5C5468]">
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
    <Card>
      <CardTitle>Badges</CardTitle>
      <div className="grid grid-cols-3 gap-3">
        {badges.map((b) => {
          const Icon = BADGE_ICONS[b.icon];
          return (
            <div key={b.id} className="group flex flex-col items-center text-center" title={b.description}>
              <div
                className={cn(
                  "relative flex size-14 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:-translate-y-0.5",
                  b.unlocked ? "bg-[#F8EAF3]" : "border border-dashed border-[#D6D3DF] bg-[#FAF5FB]",
                )}
              >
                <Icon className={cn("size-6", b.unlocked ? "text-[#AA468E]" : "text-[#A8A3B5]")} strokeWidth={2} />
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
        <Flame className="size-4.5" color={PLUM} fill={streak > 0 ? "#DDA5D2" : "none"} />
        <span className="text-[#AA468E]">{streak}</span>
        <span className="font-inter text-xs font-semibold text-[#736A80]">day streak</span>
      </Chip>
    </div>
  );
}

function Chip({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <span
      title={title}
      className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#EADCE8] bg-white px-3.5 font-solway text-sm font-bold tabular-nums shadow-sm"
    >
      {children}
    </span>
  );
}
