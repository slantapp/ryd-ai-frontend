import { useNavigate } from "react-router-dom";
import { PlayCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardResume } from "@/api/dashboard";
import { useCoursesStore, type Course } from "@/stores/coursesStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { Panel, ProgressBar, Skeleton } from "./Panel";

const coursePath = (slug: string) => `${PRIVATE_PATHS.COURSES}/${slug}`;
const prefetch = (slug: string) => {
  void useCoursesStore.getState().ensureCurriculum(slug);
};

function lessonLine(item: DashboardResume): string {
  const position = item.lessonCount ? `Lesson ${item.lessonNumber} of ${item.lessonCount}` : `Lesson ${item.lessonNumber}`;
  return item.lessonTitle ? `${position} · ${item.lessonTitle}` : position;
}

function CourseThumb({ course, className }: { course: Course | undefined; className: string }) {
  if (!course?.img) return <div className={`${className} bg-[#F3ECFE]`} aria-hidden />;
  return <img src={course.img} alt="" className={`${className} object-cover`} loading="lazy" />;
}

/**
 * The main action: carry on with the most recent course. Other courses in progress follow as
 * compact rows. With nothing in progress, it suggests where to start.
 */
export function ResumeSection({
  loading,
  items,
  coursesBySlug,
  starter,
}: {
  loading: boolean;
  items: DashboardResume[];
  coursesBySlug: Map<string, Course>;
  /** First course to suggest when nothing is in progress. */
  starter: Course | null;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Panel label="Continue learning">
        <div className="flex gap-4">
          <Skeleton className="hidden h-28 w-44 shrink-0 sm:block" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-10 w-56" />
          </div>
        </div>
      </Panel>
    );
  }

  const [first, ...rest] = items;

  if (!first) {
    return (
      <Panel label="Start learning" className="border-dashed border-[#E0DCE8] bg-[#FBF9FE]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {starter ? (
            <CourseThumb course={starter} className="hidden h-24 w-36 shrink-0 rounded-md sm:block" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="app-type-eyebrow">Start learning</p>
            <p className="app-type-card-title mt-1">
              {starter ? `Start your first lesson: ${starter.title}` : "Start your first lesson"}
            </p>
            <p className="app-type-body mt-1 max-w-lg">
              Your AI instructor explains each idea, shows it in code, then lets you practise.
            </p>
          </div>
          <Button
            type="button"
            className="h-10 w-full shrink-0 rounded-md font-inter shadow-[0_4px_12px_rgba(170,70,142,0.2)] sm:w-auto"
            onPointerEnter={starter ? () => prefetch(starter.slug) : undefined}
            onClick={() => navigate(starter ? coursePath(starter.slug) : PRIVATE_PATHS.COURSES)}
          >
            <PlayCircle className="mr-2 size-4" />
            {starter ? "Start learning" : "Explore courses"}
          </Button>
        </div>
      </Panel>
    );
  }

  const firstCourse = coursesBySlug.get(first.slug);

  return (
    <Panel label="Continue learning" className="p-0 sm:p-0">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <CourseThumb course={firstCourse} className="h-36 w-full shrink-0 rounded-md sm:h-32 sm:w-52" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="app-type-eyebrow">Continue learning</p>
          <h2 className="app-type-section-title mt-1 line-clamp-2">{first.title}</h2>
          <p className="app-type-meta mt-1 line-clamp-1">{lessonLine(first)}</p>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={first.progress} />
            <span className="app-type-meta shrink-0 font-semibold tabular-nums text-[#132050]">{first.progress}%</span>
          </div>
          <Button
            type="button"
            className="mt-4 h-10 w-full rounded-md font-inter shadow-[0_4px_12px_rgba(170,70,142,0.2)] sm:w-fit"
            onPointerEnter={() => prefetch(first.slug)}
            onFocus={() => prefetch(first.slug)}
            onClick={() => navigate(coursePath(first.slug))}
          >
            <PlayCircle className="mr-2 size-4" />
            Continue with your instructor
          </Button>
        </div>
      </div>

      {rest.length > 0 ? (
        <ul className="divide-y divide-[#F0EDF5] border-t border-[#F0EDF5]">
          {rest.map((item) => (
            <li key={item.slug} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <CourseThumb course={coursesBySlug.get(item.slug)} className="size-10 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <p className="app-type-card-title truncate text-sm">{item.title}</p>
                <p className="app-type-meta truncate tabular-nums">{lessonLine({ ...item, lessonTitle: null })}</p>
                <ProgressBar value={item.progress} className="mt-1.5 h-1.5 max-w-48" />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-md border-[#E0DCE8] font-inter shadow-none"
                onPointerEnter={() => prefetch(item.slug)}
                onClick={() => navigate(coursePath(item.slug))}
              >
                Continue
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
