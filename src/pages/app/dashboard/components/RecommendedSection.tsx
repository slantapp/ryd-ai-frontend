import { useNavigate } from "react-router-dom";
import { Clock, Sparkles } from "lucide-react";
import type { DashboardRecommendation } from "@/api/dashboard";
import { useCoursesStore, type Course } from "@/stores/coursesStore";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { recommendationReason } from "../dashboardText";
import { Panel, SectionHeader } from "./Panel";

/** Up to three courses to start next, each with the reason it was picked. */
export function RecommendedSection({
  items,
  coursesBySlug,
}: {
  items: DashboardRecommendation[];
  coursesBySlug: Map<string, Course>;
}) {
  const navigate = useNavigate();
  const rows = items
    .map((rec) => ({ rec, course: coursesBySlug.get(rec.slug) }))
    .filter((r): r is { rec: DashboardRecommendation; course: Course } => !!r.course);
  if (!rows.length) return null;

  return (
    <Panel label="Recommended next">
      <SectionHeader title="Recommended next" linkTo={PRIVATE_PATHS.COURSES} linkLabel="Browse all" />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ rec, course }) => (
          <li key={course.slug}>
            <button
              type="button"
              onPointerEnter={() => void useCoursesStore.getState().ensureCurriculum(course.slug)}
              onFocus={() => void useCoursesStore.getState().ensureCurriculum(course.slug)}
              onClick={() => navigate(`${PRIVATE_PATHS.COURSES}/${course.slug}`)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-lg border border-[#EFEDF3] bg-white text-left transition-all hover:border-primary/25 hover:shadow-[0_6px_16px_rgba(19,32,80,0.06)]"
            >
              {course.img ? (
                <img src={course.img} alt="" className="h-28 w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-28 w-full bg-[#F3ECFE]" aria-hidden />
              )}
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <p className="app-type-meta flex items-center gap-1 font-semibold text-primary">
                  <Sparkles className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{recommendationReason(rec)}</span>
                </p>
                <p className="app-type-card-title line-clamp-2 text-sm">{course.title}</p>
                <p className="app-type-meta mt-auto flex items-center gap-2 pt-1">
                  {course.level ? <span>{course.level}</span> : null}
                  {course.duration ? (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" aria-hidden />
                      {course.duration}
                    </span>
                  ) : null}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
