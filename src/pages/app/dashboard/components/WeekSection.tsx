import type { LearningStats } from "@/api/learningStats";
import { cn } from "@/lib/utils";
import { formatMinutes } from "../dashboardText";
import { Panel, SectionHeader, Skeleton } from "./Panel";

/** "2026-10-08" → "Thu" (from the date itself, no timezone shift). */
const weekday = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

/** The last 7 days: lessons per day, with today highlighted. Totals live in TotalsSection. */
export function WeekSection({ loading, stats }: { loading: boolean; stats: LearningStats | null }) {
  if (loading) {
    return (
      <Panel label="This week">
        <Skeleton className="mb-4 h-5 w-32" />
        <Skeleton className="h-14 w-full" />
      </Panel>
    );
  }
  if (!stats) return null;

  const days = stats.last7Days;
  const weekMinutes = days.reduce((n, d) => n + d.minutes, 0);
  const weekLessons = days.reduce((n, d) => n + d.lessons, 0);

  return (
    <Panel label="This week">
      <SectionHeader
        title="This week"
        subtitle={
          weekLessons || weekMinutes
            ? `${weekLessons} ${weekLessons === 1 ? "lesson" : "lessons"} · ${formatMinutes(weekMinutes)}`
            : "Learn a little every day to build your streak."
        }
      />
      <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Last 7 days">
        {days.map((d) => {
          const isToday = d.date === stats.today.day;
          return (
            <li
              key={d.date}
              className="flex flex-col items-center gap-1.5"
              title={`${d.lessons} ${d.lessons === 1 ? "lesson" : "lessons"} · ${d.minutes} min`}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-[11px] font-bold tabular-nums sm:size-10",
                  d.active ? "bg-primary text-white shadow-[0_4px_10px_rgba(170,70,142,0.25)]" : "bg-[#F4F2F8] text-[#A8A3B5]",
                  isToday && !d.active && "ring-2 ring-primary/40",
                )}
              >
                {d.lessons || (d.active ? "✓" : "")}
              </span>
              <span className={cn("app-type-meta text-[11px]", isToday && "font-semibold text-primary")}>
                {isToday ? "Today" : weekday(d.date)}
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
