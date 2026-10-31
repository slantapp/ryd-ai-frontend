import { useNavigate } from "react-router-dom";
import { ArrowRight, Flame, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LearningStats } from "@/api/learningStats";
import { PRIVATE_PATHS } from "@/utils/routePaths";

/** Greeting plus the two things to keep up every day: the streak and today's lesson goal. */
export function DashboardHeader({ firstName, stats }: { firstName: string; stats: LearningStats | null }) {
  const navigate = useNavigate();
  const streak = stats?.streak ?? 0;
  const today = stats?.today;

  return (
    <header className="relative overflow-hidden rounded-lg border border-[#E5E3E9] bg-white p-4 shadow-[0_1px_3px_rgba(19,32,80,0.04)] md:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#F3ECFE]/70 to-transparent" aria-hidden />
      <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="app-type-eyebrow">Your learning hub</p>
          <h1 className="app-type-page-title truncate">Welcome back, {firstName}</h1>
          <p className="app-type-page-subtitle max-w-2xl">
            Learn with your AI instructor, one lesson at a time.
          </p>
          {stats ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <span
                className={
                  streak > 0
                    ? "inline-flex items-center gap-1.5 rounded-full border border-[#FBD9B5] bg-[#FFF7ED] px-3 py-1 font-inter text-xs font-semibold text-[#9A3412]"
                    : "inline-flex items-center gap-1.5 rounded-full border border-[#E5E3E9] bg-[#F8F8FA] px-3 py-1 font-inter text-xs font-semibold text-[#5C5468]"
                }
              >
                <Flame className="size-3.5" fill={streak > 0 ? "#FDBA74" : "none"} aria-hidden />
                {streak > 0 ? `${streak}-day streak` : "Start a streak today"}
              </span>
              {today ? (
                <span
                  className={
                    today.goalReached
                      ? "inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1 font-inter text-xs font-semibold text-[#15803D]"
                      : "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-[#FBF5FC] px-3 py-1 font-inter text-xs font-semibold text-primary"
                  }
                >
                  <Target className="size-3.5" aria-hidden />
                  {today.goalReached
                    ? "Today's goal reached"
                    : `${today.lessonsCompleted} of ${today.goal} lessons today`}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full shrink-0 rounded-md border-[#E0DCE8] font-inter shadow-none sm:w-auto"
          onClick={() => navigate(PRIVATE_PATHS.COURSES)}
        >
          Browse courses
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </header>
  );
}
