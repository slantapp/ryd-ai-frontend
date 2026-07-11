import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildV2SkipPanelItems,
  type V2SkipTarget,
} from "../skipBeats";
import type { LessonV2 } from "../types";

type V2SkipPanelProps = {
  lesson: LessonV2;
  activeBeatId: string | null;
  onJump: (target: V2SkipTarget) => void;
};

export function V2SkipPanel({
  lesson,
  activeBeatId,
  onJump,
}: V2SkipPanelProps) {
  const [open, setOpen] = useState(false);
  const items = buildV2SkipPanelItems(lesson);
  if (items.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-gray-200 bg-gray-50/80 px-4 py-2 sm:px-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-primary hover:underline"
        aria-expanded={open}
      >
        {open ? "Hide skip sections" : "Show skip sections"}
      </button>

      {open && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
          {items.map((item) => {
            const isActive = activeBeatId === item.id;
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
      )}
    </div>
  );
}
