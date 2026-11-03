import { useEffect, useRef } from "react";
import { RUN_DETAILS_PREFIX } from "@/utils/codeExecution/runFeedback";
import { IMAGE_LINE_PREFIX } from "@/utils/codeExecution/instrument";
import type { ConsoleInputLine } from "@/hooks/useProgramInput";

/**
 * The program's question on the console's last line while it waits. The answer is typed in the
 * input pop-up (LiveInputDialog), so this line only shows that the program is waiting.
 */
function ConsoleInput({ line }: { line: ConsoleInputLine }) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rowRef.current?.scrollIntoView({ block: "nearest" });
  }, [line.prompt]);

  return (
    <div ref={rowRef} className="flex flex-wrap items-baseline gap-x-2 text-gray-100">
      {line.prompt ? <span className="whitespace-pre-wrap">{line.prompt}</span> : null}
      <span className="inline-flex items-center gap-1.5 text-xs text-amber-300">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-300" aria-hidden />
        waiting for your answer
      </span>
    </div>
  );
}

export function ConsoleLines({
  lines,
  inputLine,
}: {
  lines: string[];
  inputLine?: ConsoleInputLine | null;
}) {
  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        if (line.startsWith(RUN_DETAILS_PREFIX)) {
          return (
            <details key={index} className="text-gray-500">
              <summary className="cursor-pointer text-gray-400">Show details</summary>
              <pre className="mt-1 whitespace-pre-wrap break-all text-xs">
                {line.slice(RUN_DETAILS_PREFIX.length)}
              </pre>
            </details>
          );
        }
        if (line.startsWith(IMAGE_LINE_PREFIX)) {
          const src = line.slice(IMAGE_LINE_PREFIX.length);
          if (!src.startsWith("data:image/png;base64,")) return null;
          return (
            <img
              key={index}
              src={src}
              alt="Chart drawn by your program"
              className="my-1 max-w-full rounded bg-white"
            />
          );
        }
        let color = "text-gray-300";
        if (line.startsWith("✅") || line.startsWith("✓")) color = "text-green-400";
        else if (line.startsWith("❌") || line.startsWith("✗")) color = "text-red-400";
        else if (line.startsWith("⚠️")) color = "text-yellow-400";
        return (
          <div key={index} className={`${color} whitespace-pre-wrap break-all`}>
            {line}
          </div>
        );
      })}
      {inputLine ? <ConsoleInput line={inputLine} /> : null}
    </div>
  );
}
