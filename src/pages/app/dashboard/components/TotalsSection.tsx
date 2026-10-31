import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Library,
  PlayCircle,
  type LucideIcon,
} from "lucide-react";
import { GradeBadge } from "@/features/tests/components/TestBits";
import { cn } from "@/lib/utils";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { formatMinutesShort } from "../dashboardText";
import { Skeleton } from "./Panel";

export type DashboardTotals = {
  courses: number;
  ongoing: number;
  completed: number;
  /** The fields below are null while the dashboard loads or when it failed (shown as "—"). */
  lessonsCompleted: number | null;
  lessonsThisWeek: number | null;
  minutesLearned: number | null;
  minutesThisWeek: number | null;
  testsTaken: number | null;
  bestGrade: string | null;
  bestPercent: number | null;
};

type Tone = { chip: string; icon: string };
const TONES: Record<string, Tone> = {
  plum: { chip: "bg-[#F6E9FB]", icon: "text-primary" },
  blue: { chip: "bg-[#EAF1FF]", icon: "text-[#2563EB]" },
  green: { chip: "bg-[#E8F7EE]", icon: "text-[#16A34A]" },
  amber: { chip: "bg-[#FFF4E0]", icon: "text-[#D97706]" },
  teal: { chip: "bg-[#E3F6F5]", icon: "text-[#0D9488]" },
  violet: { chip: "bg-[#EEEAFE]", icon: "text-[#6D28D9]" },
};

type Tile = {
  id: string;
  label: string;
  value: string | null;
  hint: ReactNode;
  Icon: LucideIcon;
  tone: Tone;
  to?: string;
};

function StatCard({ tile }: { tile: Tile }) {
  const { label, value, hint, Icon, tone, to } = tile;
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-inter text-xs font-medium leading-snug text-[#5C5468] sm:text-[13px]">{label}</p>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone.chip)}>
          <Icon className={cn("size-4", tone.icon)} aria-hidden />
        </span>
      </div>
      {value == null ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-1.5 font-solway text-2xl font-bold leading-none tabular-nums text-[#132050]">{value}</p>
      )}
      <div className="mt-2 min-h-4 font-inter text-xs leading-snug text-[#8A8494]">{value == null ? null : hint}</div>
    </>
  );
  const className =
    "flex h-full flex-col rounded-xl border border-[#E5E3E9] bg-white p-4 shadow-[0_1px_3px_rgba(19,32,80,0.04)]";
  return to ? (
    <Link
      to={to}
      className={cn(
        className,
        "transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_8px_20px_-8px_rgba(19,32,80,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/** Totals at a glance: courses, progress, lessons, time and tests, each with a short context line. */
export function TotalsSection({ totals, loading }: { totals: DashboardTotals; loading: boolean }) {
  const pending = (value: number | null, format: (n: number) => string = String) =>
    loading ? null : value == null ? "—" : format(value);
  const thisWeek = (n: number | null, format: (n: number) => string = String) =>
    n == null ? null : n > 0 ? `${format(n)} this week` : "None this week yet";
  const completedShare = totals.courses ? Math.round((totals.completed / totals.courses) * 100) : 0;

  const tiles: Tile[] = [
    {
      id: "courses",
      label: "Courses available",
      value: String(totals.courses),
      hint: "In your library",
      Icon: Library,
      tone: TONES.plum,
      to: PRIVATE_PATHS.COURSES,
    },
    {
      id: "ongoing",
      label: "In progress",
      value: String(totals.ongoing),
      hint: totals.ongoing ? "Ready to continue" : "Start a course today",
      Icon: PlayCircle,
      tone: TONES.blue,
      to: PRIVATE_PATHS.COURSES,
    },
    {
      id: "completed",
      label: "Courses completed",
      value: String(totals.completed),
      hint: totals.courses ? `${completedShare}% of available courses` : null,
      Icon: GraduationCap,
      tone: TONES.green,
    },
    {
      id: "lessons",
      label: "Lessons completed",
      value: pending(totals.lessonsCompleted),
      hint: thisWeek(totals.lessonsThisWeek),
      Icon: BookOpenCheck,
      tone: TONES.amber,
      to: PRIVATE_PATHS.LEARNING_PATH,
    },
    {
      id: "time",
      label: "Time learned",
      value: pending(totals.minutesLearned, formatMinutesShort),
      hint: thisWeek(totals.minutesThisWeek, formatMinutesShort),
      Icon: Clock,
      tone: TONES.teal,
    },
    {
      id: "tests",
      label: "Tests taken",
      value: pending(totals.testsTaken),
      hint: totals.bestGrade ? (
        <span className="inline-flex items-center gap-1.5">
          Best <GradeBadge grade={totals.bestGrade} size="sm" />
          {totals.bestPercent != null ? `${Math.round(totals.bestPercent)}%` : null}
        </span>
      ) : totals.testsTaken === 0 ? (
        "No tests taken yet"
      ) : null,
      Icon: ClipboardCheck,
      tone: TONES.violet,
      to: PRIVATE_PATHS.TESTS,
    },
  ];

  return (
    <section aria-label="Your totals">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {tiles.map((tile) => (
          <li key={tile.id} className="min-w-0">
            <StatCard tile={tile} />
          </li>
        ))}
      </ul>
    </section>
  );
}
