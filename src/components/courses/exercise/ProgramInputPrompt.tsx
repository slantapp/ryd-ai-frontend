import { useEffect, useRef } from "react";
import { CornerDownLeft, Keyboard } from "lucide-react";
import type { ProgramInputPrompt as ProgramInputPromptState } from "@/hooks/useProgramInput";
import { InputDialogFrame } from "./InputDialogFrame";

type ProgramInputPromptProps = {
  prompt: ProgramInputPromptState;
};

/**
 * Input collected before the program runs: one value per read, or (multiline) every line of a
 * program that reads until the input ends. Rendered over the page so fullscreen still shows it.
 */
export default function ProgramInputPrompt({ prompt }: ProgramInputPromptProps) {
  const fieldRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const last = prompt.index >= prompt.total - 1;

  useEffect(() => {
    fieldRef.current?.focus();
    if (!prompt.multiline) fieldRef.current?.select();
  }, [prompt.index, prompt.line, prompt.multiline]);

  const subtitle = prompt.multiline
    ? "Your program reads several lines"
    : prompt.total === 1
      ? "Your program is waiting for a value"
      : `Value ${prompt.index + 1} of ${prompt.total}`;

  return (
    <InputDialogFrame
      titleId="program-input-title"
      eyebrow="Program input"
      title={prompt.label}
      subtitle={subtitle}
      icon={<Keyboard className="size-[18px]" aria-hidden />}
      onCancel={prompt.onCancel}
      onSubmit={prompt.onSubmit}
      cancelLabel="Cancel"
      footerStart={
        prompt.index > 0 ? (
          <button
            type="button"
            onClick={prompt.onBack}
            className="h-10 rounded-lg px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
          >
            Back
          </button>
        ) : (
          <span className="hidden text-xs text-gray-400 sm:inline">
            {prompt.multiline ? "Ctrl + Enter runs the program" : "Enter submits this value"}
          </span>
        )
      }
      submitLabel={
        <>
          {last ? prompt.confirmLabel : "Next"}
          <CornerDownLeft size={14} aria-hidden />
        </>
      }
    >
      {prompt.line > 0 ? (
        <p className="overflow-x-auto rounded-lg bg-[#1e1e1e] px-3 py-2 font-mono text-xs text-gray-100">
          <span className="mr-2 text-amber-300">line {prompt.line}</span>
          {prompt.snippet}
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-gray-600">{prompt.snippet}</p>
      )}
      {prompt.multiline ? (
        <textarea
          ref={fieldRef}
          value={prompt.value}
          onChange={(event) => prompt.onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              prompt.onSubmit();
            }
          }}
          aria-label={prompt.label}
          rows={5}
          spellCheck={false}
          placeholder={"3\n9\n7"}
          className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm leading-relaxed text-gray-900 outline-none ring-primary/30 focus:border-primary focus:ring-2"
        />
      ) : (
        <input
          ref={fieldRef}
          value={prompt.value}
          onChange={(event) => prompt.onChange(event.target.value)}
          aria-label={prompt.label}
          autoComplete="off"
          spellCheck={false}
          placeholder="Type the value, then press Enter"
          className="h-11 w-full rounded-lg border border-gray-300 px-3 font-mono text-sm text-gray-900 outline-none ring-primary/30 focus:border-primary focus:ring-2"
        />
      )}
    </InputDialogFrame>
  );
}
