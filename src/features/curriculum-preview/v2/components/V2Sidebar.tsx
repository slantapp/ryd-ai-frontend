import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CurriculumV2Data, LessonV2 } from "../types";

interface V2SidebarProps {
  curriculum: CurriculumV2Data;
  currentLesson: LessonV2 | null;
  currentLessonOrdinal?: number;
  onSelectLesson: (lesson: LessonV2) => void;
  completedLessons: Set<string>;
  headerSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
}

export function V2Sidebar({
  curriculum,
  currentLesson,
  currentLessonOrdinal,
  onSelectLesson,
  completedLessons,
  headerSlot,
  footerSlot,
}: V2SidebarProps) {
  const allLessons = useMemo(
    () => curriculum.modules.flatMap((m) => m.lessons),
    [curriculum.modules],
  );
  const completedCount = allLessons.filter((l) =>
    completedLessons.has(l.id),
  ).length;
  const progressPct =
    allLessons.length === 0
      ? 0
      : Math.round((completedCount / allLessons.length) * 100);

  const lessonIndexById = useMemo(() => {
    const map = new Map<string, number>();
    let i = 0;
    for (const mod of curriculum.modules) {
      for (const lesson of mod.lessons) {
        map.set(lesson.id, ++i);
      }
    }
    return map;
  }, [curriculum.modules]);

  const ordinal =
    currentLessonOrdinal ??
    (currentLesson ? lessonIndexById.get(currentLesson.id) ?? 0 : 0);

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(curriculum.modules.map((m) => m.id)),
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {headerSlot}

      <div className="shrink-0 border-b border-gray-100 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-gray-900">
              {curriculum.title}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {completedCount} / {allLessons.length} lessons
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {curriculum.level && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold text-primary">
                {curriculum.level}
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[0.65rem] font-semibold text-gray-600">
              {progressPct}%
            </span>
          </div>
        </div>

        {currentLesson && (
          <div className="mt-3 rounded-xl bg-primary/5 px-3 py-2.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-primary">
              Now learning · Lesson {ordinal}/{allLessons.length}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">
              {currentLesson.title}
            </p>
          </div>
        )}

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${Math.max(progressPct, completedCount > 0 ? 6 : 0)}%`,
            }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        {curriculum.modules.map((module) => {
          const open = expanded.has(module.id);
          return (
            <div key={module.id} className="mb-2">
              <button
                type="button"
                onClick={() => toggle(module.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-50"
              >
                {open ? (
                  <ChevronDown className="size-4 shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight className="size-4 shrink-0 text-gray-400" />
                )}
                <span className="min-w-0 flex-1 truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {module.title}
                </span>
              </button>

              {open && (
                <div className="space-y-0.5 pb-1">
                  {module.lessons.map((lesson) => {
                    const n = lessonIndexById.get(lesson.id) ?? 0;
                    const active = currentLesson?.id === lesson.id;
                    const done = completedLessons.has(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => onSelectLesson(lesson)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-gray-700 hover:bg-gray-50",
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
                        ) : active ? (
                          <span className="flex size-5 shrink-0 items-center justify-center">
                            <span className="size-2.5 rounded-full bg-primary" />
                          </span>
                        ) : (
                          <Circle className="size-5 shrink-0 text-gray-300" />
                        )}
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-sm",
                            active ? "font-semibold" : "font-medium",
                          )}
                        >
                          {n}. {lesson.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {footerSlot && (
        <div className="shrink-0 border-t border-gray-100 p-3">{footerSlot}</div>
      )}
    </div>
  );
}
