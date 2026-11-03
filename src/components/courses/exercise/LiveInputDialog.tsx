import { useEffect, useRef } from "react";
import { CornerDownLeft, TerminalSquare } from "lucide-react";
import type { ConsoleInputLine } from "@/hooks/useProgramInput";
import { InputDialogFrame } from "./InputDialogFrame";

/**
 * The running program (Python `input()`, C++ `std::cin`) is waiting for one answer.
 * Shows what it printed last and its question, like a terminal, and takes one value.
 * A loop that asks again opens the pop-up again for the next answer.
 */
export default function LiveInputDialog({ line }: { line: ConsoleInputLine }) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const question = line.prompt.trim();

  useEffect(() => {
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, [line.number, line.prompt]);

  return (
    <InputDialogFrame
      titleId="live-input-title"
      eyebrow="Program input"
      title={question || "Your program is waiting for input"}
      subtitle={line.number > 1 ? `Answer ${line.number}` : "Type your answer to continue the program"}
      icon={<TerminalSquare className="size-[18px]" aria-hidden />}
      onCancel={line.onCancel}
      onSubmit={line.onSubmit}
      cancelLabel="Stop program"
      footerStart={
        line.canEnd ? (
          // The program reads until the input ends (like Ctrl+D in a terminal).
          <button
            type="button"
            onClick={line.onEnd}
            title="Tell the program there is no more input"
            className="h-10 rounded-lg px-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
          >
            No more input
          </button>
        ) : (
          <span className="hidden text-xs text-gray-400 sm:inline">Enter sends your answer</span>
        )
      }
      submitLabel={
        <>
          Send
          <CornerDownLeft size={14} aria-hidden />
        </>
      }
    >
      {line.recent.length > 0 || question ? (
        <div
          className="max-h-40 overflow-auto rounded-lg bg-[#1e1e1e] px-3 py-2 font-mono text-[13px] leading-relaxed text-gray-300"
          aria-label="Program output so far"
        >
          {line.recent.map((text, index) => (
            <div key={index} className="whitespace-pre-wrap break-words">
              {text || " "}
            </div>
          ))}
          {question ? (
            <div className="whitespace-pre-wrap break-words text-gray-100">
              {line.prompt}
              <span className="ml-0.5 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-amber-300" aria-hidden />
            </div>
          ) : null}
        </div>
      ) : null}
      <input
        ref={fieldRef}
        value={line.value}
        onChange={(event) => line.onChange(event.target.value)}
        aria-label={question || "Answer for the program"}
        autoComplete="off"
        spellCheck={false}
        placeholder="Type your answer, then press Enter"
        className="h-11 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm text-gray-900 outline-none ring-primary/30 focus:border-primary focus:ring-2"
      />
    </InputDialogFrame>
  );
}
