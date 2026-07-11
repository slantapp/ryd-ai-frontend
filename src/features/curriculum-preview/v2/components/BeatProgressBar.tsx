import type { Beat } from "../types";

interface BeatProgressBarProps {
  flow: Beat[];
  beatIndex: number;
  completedBeatIds: Set<string>;
  onJump?: (index: number) => void;
}

export function BeatProgressBar({
  flow,
  beatIndex,
  completedBeatIds,
  onJump,
}: BeatProgressBarProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 text-sm font-medium text-gray-600">
        Step {Math.min(beatIndex + 1, flow.length)} / {flow.length}
      </span>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-primary/15">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{
            width: `${Math.max(6, ((beatIndex + 1) / flow.length) * 100)}%`,
          }}
        />
      </div>
      <div className="hidden gap-1 sm:flex">
        {flow.map((beat, i) => {
          const done = completedBeatIds.has(beat.id) || i < beatIndex;
          const active = i === beatIndex;
          return (
            <button
              key={beat.id}
              type="button"
              title={beat.id}
              disabled={!onJump}
              onClick={() => onJump?.(i)}
              className={`h-2 w-2 rounded-full ${
                active
                  ? "bg-primary"
                  : done
                    ? "bg-primary/40"
                    : "bg-gray-300"
              } ${onJump ? "cursor-pointer" : "cursor-default"}`}
            />
          );
        })}
      </div>
    </div>
  );
}
