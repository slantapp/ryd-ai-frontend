import { useEffect, useRef } from "react";
import { RUN_DETAILS_PREFIX } from "@/utils/codeExecution/runFeedback";
import { IMAGE_LINE_PREFIX } from "@/utils/codeExecution/instrument";
import type { ConsoleInputLine } from "@/hooks/useProgramInput";

/** The program's question and a typing line, on the console's last line. */
function ConsoleInput({ line }: { line: ConsoleInputLine }) {
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fieldRef.current?.focus({ preventScroll: false });
    fieldRef.current?.scrollIntoView({ block: "nearest" });
  }, [line.prompt]);

  return (
    <form
      className="flex items-baseline gap-0 text-gray-100"
      onSubmit={(event) => {
        event.preventDefault();
        line.onSubmit();
      }}
    >
      {line.prompt ? <span className="whitespace-pre-wrap">{line.prompt}</span> : null}
      <input
        ref={fieldRef}
        value={line.value}
        onChange={(event) => line.onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            line.onCancel();
          }
        }}
        aria-label={line.prompt.trim() || "Type an answer for the program"}
        placeholder="type, then press Enter"
        autoComplete="off"
        spellCheck={false}
        className="min-w-24 flex-1 border-0 border-b border-dashed border-gray-500 bg-transparent px-0.5 font-mono text-amber-200 caret-amber-200 outline-none placeholder:text-gray-600 focus:border-amber-300"
      />
    </form>
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
