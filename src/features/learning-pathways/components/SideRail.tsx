import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningStats } from "@/api/learningStats";

/** "2026-10-08" -> one-letter weekday ("T"), using the date itself (no timezone shift). */
function weekdayLetter(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "narrow", timeZone: "UTC" });
}

/** Compact streak: days with a finished lesson or at least 5 minutes of learning. */
export function StreakCard({ stats }: { stats: LearningStats | null }) {
  const streak = stats?.streak ?? 0;
  const activeToday = !!stats?.activeToday;
  const days = stats?.last7Days ?? [];

  return (
    <section className="flex items-center gap-3 rounded-[22px] border border-[#FBD9B5] bg-linear-to-r from-[#FFF7ED] to-white px-3.5 py-3 shadow-[0_8px_24px_-16px_rgba(234,88,12,0.35)]">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFEDD5]">
        <Flame className="size-6" fill={streak > 0 ? "#FB923C" : "none"} color="#C2410C" strokeWidth={1.8} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-solway text-[15px] font-bold leading-none tracking-wide text-[#132050]">{streak} DAY STREAK</p>
        <p className="mt-1 font-inter text-xs font-semibold text-[#C2410C]">
          {activeToday ? "Lit for today" : "Light it with a lesson today"}
        </p>
      </div>
      {days.length > 0 && (
        <div className="grid shrink-0 grid-cols-7 gap-1">
          {days.map((day) => {
            const isToday = day.date === stats?.today.day;
            return (
              <div key={day.date} className="flex flex-col items-center gap-1" title={`${day.date}: ${day.lessons} lesson(s)`}>
                <span className={cn("font-inter text-[10px] font-bold leading-none", isToday ? "text-[#132050]" : "text-[#B0A8B8]")}>
                  {weekdayLetter(day.date)}
                </span>
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    day.active ? "bg-[#F97316]" : "bg-[#E7E2EA]",
                    isToday && !day.active && "ring-2 ring-[#FDBA74]",
                  )}
                />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
