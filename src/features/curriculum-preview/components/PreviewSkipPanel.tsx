import { FastForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lesson } from "../types";
import {
  buildSkipPanelItems,
  type LessonJumpTarget,
  type LessonPreviewMode,
} from "../lessonSegments";

type PreviewSkipPanelProps = {
  lesson: Lesson;
  activeItemId: string | null;
  onJump: (target: LessonJumpTarget) => void;
  mode?: LessonPreviewMode;
};

export function PreviewSkipPanel({
  lesson,
  activeItemId,
  onJump,
  mode = "coding",
}: PreviewSkipPanelProps) {
  const items = buildSkipPanelItems(lesson, mode);

  if (items.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-gray-200 bg-gray-50/80 px-4 py-3 sm:px-6">
      <div className="mb-2 flex items-center gap-2">
        <FastForward className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          Skip to section
        </h3>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
        {items.map((item) => {
          const isActive = activeItemId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onJump(item.target)}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 bg-white text-gray-700 hover:border-primary/30 hover:bg-primary/5",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
