import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CornerDownLeft } from "lucide-react";
import type { ProgramInputPrompt as ProgramInputPromptState } from "@/hooks/useProgramInput";

type ProgramInputPromptProps = {
  prompt: ProgramInputPromptState;
};

/** Submit box for one program read. Rendered over the page so fullscreen still shows it. */
export default function ProgramInputPrompt({ prompt }: ProgramInputPromptProps) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const last = prompt.index >= prompt.total - 1;

  useEffect(() => {
    fieldRef.current?.focus();
    fieldRef.current?.select();
  }, [prompt.index, prompt.line]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        prompt.onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prompt]);

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center bg-[#1e1e1e]/55 p-3 sm:items-center"
      style={{ zIndex: 10050 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) prompt.onCancel();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="program-input-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          prompt.onSubmit();
        }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-primary">
              Program input
            </p>
            <p id="program-input-title" className="text-sm text-gray-500">
              {prompt.total === 1
                ? "The program is waiting for a value"
                : `Value ${prompt.index + 1} of ${prompt.total}`}
            </p>
          </div>
          <button
            type="button"
            onClick={prompt.onCancel}
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <p className="text-base font-semibold leading-snug text-gray-900">
            {prompt.label}
          </p>
          {prompt.line > 0 ? (
            <p className="overflow-x-auto rounded-lg bg-[#1e1e1e] px-3 py-2 font-mono text-xs text-gray-100">
              <span className="mr-2 text-amber-300">line {prompt.line}</span>
              {prompt.snippet}
            </p>
          ) : (
            <p className="text-sm text-gray-500">{prompt.snippet}</p>
          )}
          <input
            ref={fieldRef}
            value={prompt.value}
            onChange={(event) => prompt.onChange(event.target.value)}
            aria-label={prompt.label}
            placeholder="Type the value, then submit"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm text-gray-900 outline-none ring-primary/30 focus:border-primary focus:ring-2"
          />
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3">
          {prompt.index > 0 ? (
            <button
              type="button"
              onClick={prompt.onBack}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Back
            </button>
          ) : (
            <span className="text-xs text-gray-400">Enter submits this value</span>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            {last ? prompt.confirmLabel : "Next"}
            <CornerDownLeft size={14} aria-hidden />
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
