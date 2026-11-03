import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Check, Copy, GitCompare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnswerReview } from "@/utils/answerReview";
import { toMonacoLanguage } from "@/utils/codeExecution/monacoLanguage";
import type { WebCodeSources } from "@/utils/webCodeWorkspace";

const DiffEditor = lazy(() =>
  import("@monaco-editor/react").then((module) => ({ default: module.DiffEditor })),
);

type Pane = { key: string; label: string; language: string; mine: string; answer: string };

const WEB_TABS: { key: keyof WebCodeSources; label: string; language: string }[] = [
  { key: "html", label: "HTML", language: "html" },
  { key: "css", label: "CSS", language: "css" },
  { key: "javascript", label: "JavaScript", language: "javascript" },
];

/** One pane per file: a single source, or the HTML/CSS/JavaScript tabs that have something to compare. */
function panesFor(review: AnswerReview): Pane[] {
  if ("code" in review.answer) {
    const mine = "code" in review.learner ? review.learner.code : "";
    return [
      { key: "code", label: "Code", language: toMonacoLanguage(review.language), mine, answer: review.answer.code },
    ];
  }
  const answer = review.answer.web;
  const mine = "web" in review.learner ? review.learner.web : { html: "", css: "", javascript: "" };
  return WEB_TABS.map((tab) => ({
    key: tab.key,
    label: tab.label,
    language: tab.language,
    mine: mine[tab.key] ?? "",
    answer: answer[tab.key] ?? "",
  })).filter((pane) => pane.mine.trim() || pane.answer.trim());
}

/** Prefer the tab the learner was asked to change: the one where their code differs from the answer. */
function firstDifferent(panes: Pane[]): string {
  const changed = panes.filter((p) => p.mine.trim() !== p.answer.trim());
  return (changed.find((p) => p.key === "javascript") ?? changed[0] ?? panes[0])?.key ?? "code";
}

/**
 * Side-by-side comparison of the learner's code and the stored answer (read-only Monaco diff).
 * Rendered over the page so it also works while the editor is fullscreen.
 */
export default function AnswerCompareDialog({
  review,
  onClose,
  onContinue,
  continueLabel = "Continue",
}: {
  review: AnswerReview;
  onClose: () => void;
  /** Shown when the lesson is ready to move on. */
  onContinue?: (() => void) | null;
  continueLabel?: string;
}) {
  const panes = useMemo(() => panesFor(review), [review]);
  const [active, setActive] = useState(() => firstDifferent(panes));
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pane = panes.find((p) => p.key === active) ?? panes[0];
  const identical = pane ? pane.mine.trim() === pane.answer.trim() : false;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyAnswer = async () => {
    if (!pane) return;
    try {
      await navigator.clipboard.writeText(pane.answer);
      setCopied(true);
    } catch {
      /* Clipboard blocked: the answer is still on screen. */
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-end justify-center bg-[#0f1222]/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      style={{ zIndex: 10060 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="answer-compare-title"
        className="flex h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[min(84dvh,46rem)] sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GitCompare className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="answer-compare-title" className="text-base font-semibold text-gray-900">
                Compare with the correct answer
              </h2>
              <p className="text-[13px] leading-snug text-gray-500">
                <span className="min-[560px]:hidden">Red lines are yours, green lines are the answer.</span>
                <span className="hidden min-[560px]:inline">
                  Your code is on the left and the correct answer is on the right. Highlighted lines are different.
                </span>
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close comparison"
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {panes.length > 1 ? (
          <div className="flex items-center border-b border-gray-100 bg-gray-50/70 px-4 py-2 sm:px-5">
            <div role="tablist" aria-label="File" className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              {panes.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={p.key === pane?.key}
                  onClick={() => setActive(p.key)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                    p.key === pane?.key ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Below 560px the diff is one column: red lines are yours, green lines are the answer. */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 py-1.5 pl-4 pr-2 text-xs font-semibold text-gray-700 min-[560px]:hidden">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-red-500" aria-hidden /> Your code
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-green-500" aria-hidden /> Correct answer
            </span>
          </span>
          <button
            type="button"
            onClick={() => void copyAnswer()}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            {copied ? <Check className="size-3.5 text-green-600" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="hidden shrink-0 grid-cols-2 border-b border-gray-100 text-xs font-semibold min-[560px]:grid">
          <div className="flex items-center gap-2 px-4 py-2 text-gray-700 sm:px-5">
            <span className="size-2 rounded-full bg-red-500" aria-hidden /> Your code
          </div>
          <div className="flex items-center justify-between gap-2 border-l border-gray-100 py-1.5 pl-4 pr-2 text-gray-700 sm:pl-5">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-500" aria-hidden /> Correct answer
            </span>
            <button
              type="button"
              onClick={() => void copyAnswer()}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              {copied ? <Check className="size-3.5 text-green-600" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-[#1e1e1e]">
          {pane ? (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-gray-400" aria-busy="true">
                  Loading comparison…
                </div>
              }
            >
              <DiffEditor
                key={pane.key}
                theme="vs-dark"
                language={pane.language}
                original={pane.mine}
                modified={pane.answer}
                height="100%"
                loading={null}
                // The library disposes its models before the diff widget lets go of them, which throws
                // on close. Keep them, and dispose them after the editor is gone (see onMount).
                keepCurrentOriginalModel
                keepCurrentModifiedModel
                onMount={(editor) => {
                  const models = editor.getModel();
                  editor.onDidDispose(() => {
                    window.setTimeout(() => {
                      models?.original.dispose();
                      models?.modified.dispose();
                    }, 0);
                  });
                }}
                options={{
                  readOnly: true,
                  originalEditable: false,
                  renderSideBySide: true,
                  // Stay side by side on tablets; phones fall back to one column.
                  renderSideBySideInlineBreakpoint: 560,
                  automaticLayout: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  renderOverviewRuler: false,
                  lineNumbersMinChars: 3,
                  folding: false,
                  wordWrap: "on",
                  diffWordWrap: "on",
                  padding: { top: 8 },
                }}
              />
            </Suspense>
          ) : null}
          {identical ? (
            <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-700 shadow">
              This file matches the answer. Check the other tabs.
            </p>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Back to my code
          </button>
          {onContinue ? (
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              {continueLabel}
              <ArrowRight className="size-4" aria-hidden />
            </button>
          ) : null}
        </footer>
      </section>
    </div>,
    document.body,
  );
}
