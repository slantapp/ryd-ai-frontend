import { ChevronDown, ChevronRight, BookOpen, HelpCircle, CheckCircle } from "lucide-react";
import { useState } from "react";
import type { CurriculumData, Lesson } from "../types";

interface PreviewSidebarProps {
  curriculum: CurriculumData;
  currentLesson: Lesson | null;
  onSelectLesson: (lesson: Lesson) => void;
  completedLessons?: Set<string>;
}

export function PreviewSidebar({
  curriculum,
  currentLesson,
  onSelectLesson,
  completedLessons = new Set(),
}: PreviewSidebarProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(curriculum.modules.length > 0 ? [curriculum.modules[0].id] : [])
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-bold text-gray-900">{curriculum.title}</h2>
        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
          {curriculum.description}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {curriculum.modules.map((module, moduleIndex) => {
          const isExpanded = expandedModules.has(module.id);
          const completedCount = module.lessons.filter((l) =>
            completedLessons.has(l.id)
          ).length;

          return (
            <div key={module.id} className="border-b border-gray-100">
              <button
                type="button"
                onClick={() => toggleModule(module.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                  {moduleIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate">
                    {module.title}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {completedCount}/{module.lessons.length} lessons
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
                )}
              </button>
              {isExpanded && (
                <div className="pb-2">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const isActive = currentLesson?.id === lesson.id;
                    const isCompleted = completedLessons.has(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => onSelectLesson(lesson)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 pl-8 text-left transition-colors ${
                          isActive
                            ? "bg-primary/10 border-l-4 border-primary"
                            : "hover:bg-gray-50 border-l-4 border-transparent"
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            isCompleted
                              ? "bg-green-100 text-green-600"
                              : isActive
                              ? "bg-primary/15 text-primary"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <span className="text-xs font-medium">
                              {lessonIndex + 1}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm truncate ${
                              isActive
                                ? "font-semibold text-primary"
                                : "text-gray-700"
                            }`}
                          >
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <BookOpen className="h-3 w-3" />
                              Lesson
                            </span>
                            {lesson.questions.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <HelpCircle className="h-3 w-3" />
                                {lesson.questions.length} Q
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
