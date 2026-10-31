import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { DashboardPath } from "@/api/dashboard";
import { pathwayIcon } from "@/features/learning-pathways/components/icons";
import { PRIVATE_PATHS } from "@/utils/routePaths";
import { Panel, ProgressBar, SectionHeader } from "./Panel";

function pathLine(path: DashboardPath): string {
  if (path.finished) return `Finished · ${path.totalLessons} lessons`;
  const where = path.started && path.currentUnit ? `${path.currentUnit} · ` : "";
  return `${where}${path.completedLessons} of ${path.totalLessons} lessons`;
}

/** Up to two learning paths, started ones first. Hidden when no path is published. */
export function PathsSection({ paths }: { paths: DashboardPath[] }) {
  if (!paths.length) return null;
  const anyStarted = paths.some((p) => p.started);
  return (
    <Panel label="Your learning path">
      <SectionHeader
        title={anyStarted ? "Your learning path" : "Follow a learning path"}
        subtitle={anyStarted ? undefined : "Courses in the right order, unit by unit."}
        linkTo={PRIVATE_PATHS.LEARNING_PATH}
        linkLabel="Open"
      />
      <ul className="grid gap-3 md:grid-cols-2">
        {paths.map((path) => {
          const Icon = pathwayIcon(path.icon || "");
          return (
            <li key={path.id}>
              <Link
                to={PRIVATE_PATHS.LEARNING_PATH}
                className="group flex h-full flex-col gap-3 rounded-lg border border-[#EFEDF3] bg-[#FCFBFE] p-3.5 transition-all hover:border-primary/25 hover:shadow-[0_6px_16px_rgba(19,32,80,0.06)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="app-type-card-title truncate">{path.title}</p>
                    <p className="app-type-meta">{pathLine(path)}</p>
                  </div>
                  <span className="app-type-meta font-semibold tabular-nums text-[#132050]">{path.percent}%</span>
                </div>
                <ProgressBar value={path.percent} />
                {path.nextCourse && !path.finished ? (
                  <p className="app-type-meta flex items-center gap-1 text-primary">
                    {path.started ? "Up next:" : "Starts with:"} <span className="truncate font-semibold">{path.nextCourse.title}</span>
                    <ArrowRight className="ml-auto size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                  </p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
