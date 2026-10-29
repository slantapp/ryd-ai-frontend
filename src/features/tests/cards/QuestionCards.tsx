/**
 * Card bodies for each question type. They only render state; the attempt page grades through the API.
 * Layout and colours follow docs/Code Prediction Flashcard — RYD Learning.html.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock, InlineCode } from "./CodeBlock";
import { VARIANT_CLASS, type Variant } from "./cardStyles";
import type { QuestionOption } from "../types";

const LETTERS = "ABCDEF";

// ------------------------------------------------------------------------------------------------
// Code prediction + multiple choice
// ------------------------------------------------------------------------------------------------

export function ChoiceCard({
  prompt,
  code,
  language,
  options,
  selected,
  correctAnswer,
  revealed,
  disabled,
  onPick,
}: {
  prompt: string;
  code?: string | null;
  language?: string | null;
  options: QuestionOption[];
  selected: string | null;
  /** Known once revealed (learning mode). */
  correctAnswer?: string | null;
  revealed: boolean;
  disabled?: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <>
      {code ? <CodeBlock code={code} language={language} /> : null}
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={prompt}>
        {options.map((o, i) => {
          let variant: Variant = selected === o.id ? "selected" : "idle";
          if (revealed) {
            if (correctAnswer != null && o.id === String(correctAnswer)) variant = "correct";
            else if (o.id === selected) variant = "incorrect";
            else variant = "dim";
          }
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={selected === o.id}
              disabled={disabled || revealed}
              onClick={() => onPick(o.id)}
              className={cn(
                "flex min-h-[52px] w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left text-[15px] font-semibold transition disabled:cursor-default",
                VARIANT_CLASS[variant],
              )}
            >
              <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#F3EEF7] text-xs font-extrabold text-[#6B6572]">
                {LETTERS[i] ?? o.id.toUpperCase()}
              </span>
              <span className="flex-1">{o.label}</span>
              {variant === "correct" ? <Check className="size-5 shrink-0 text-[#16A34A]" strokeWidth={2.6} aria-label="Correct answer" /> : null}
              {variant === "incorrect" ? <X className="size-5 shrink-0 text-[#DC2626]" strokeWidth={2.6} aria-label="Your answer" /> : null}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// True or false
// ------------------------------------------------------------------------------------------------

export function TrueFalseCard({
  statement,
  code,
  language,
  selected,
  correctAnswer,
  revealed,
  disabled,
  onPick,
}: {
  statement: string;
  code?: string | null;
  language?: string | null;
  selected: boolean | null;
  correctAnswer?: boolean | null;
  revealed: boolean;
  disabled?: boolean;
  onPick: (value: boolean) => void;
}) {
  const look = (value: boolean) => {
    if (!revealed) {
      if (selected === value) return "border-primary bg-primary text-white";
      return value
        ? "border-[#86EFAC] bg-white text-[#15803D] hover:bg-[#F0FDF4]"
        : "border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]";
    }
    if (selected === value) {
      return value === correctAnswer ? "border-[#16A34A] bg-[#16A34A] text-white" : "border-[#DC2626] bg-[#DC2626] text-white";
    }
    if (value === correctAnswer) return "border-[#16A34A] bg-[#ECFDF3] text-[#15803D]";
    return "border-[#ECE6F0] bg-[#FAFAFA] text-[#B7B2C0]";
  };
  return (
    <>
      {code ? <CodeBlock code={code} language={language} /> : null}
      <div className="rounded-2xl bg-[#FBF5FC] px-5 py-6 text-center text-lg font-bold text-[#1F1B24] sm:text-xl">{statement}</div>
      <div className="grid grid-cols-2 gap-3">
        {[false, true].map((value) => (
          <button
            key={String(value)}
            type="button"
            disabled={disabled || revealed}
            onClick={() => onPick(value)}
            aria-pressed={selected === value}
            className={cn(
              "flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border-2 text-base font-extrabold transition disabled:cursor-default",
              look(value),
            )}
          >
            {value ? <Check className="size-5" strokeWidth={2.6} aria-hidden /> : <X className="size-5" strokeWidth={2.6} aria-hidden />}
            {value ? "True" : "False"}
          </button>
        ))}
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// Fill in the blank
// ------------------------------------------------------------------------------------------------

export type BlankStatus = "idle" | "selected" | "wrong" | "correct";

export function FillBlankCard({
  prompt,
  pre,
  post,
  language,
  options,
  filled,
  status,
  disabled,
  onPick,
}: {
  prompt: string;
  pre: string;
  post: string;
  language?: string | null;
  options: string[];
  filled: string | null;
  status: BlankStatus;
  disabled?: boolean;
  onPick: (word: string) => void;
}) {
  const blankClass = {
    idle: "border-2 border-dashed border-primary bg-transparent text-primary",
    selected: "border-2 border-primary bg-[#FBF5FC] text-[#1F1B24]",
    wrong: "animate-[tests-shake_0.35s] border-2 border-[#DC2626] bg-[#DC2626] text-white",
    correct: "border-2 border-[#16A34A] bg-[#16A34A] text-white",
  }[status];
  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <div className="rounded-2xl bg-[#1E1B2E] px-5 py-6 font-mono text-[17px] leading-loose sm:text-[19px]">
        {pre ? <InlineCode code={pre} language={language} /> : null}
        <span className={cn("mx-1 inline-block min-w-[4.5rem] rounded-lg px-2 py-0.5 text-center align-middle font-bold", blankClass)}>
          {filled ?? "____"}
        </span>
        {post ? <InlineCode code={post} language={language} /> : null}
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {options.map((word) => {
          const chosen = filled === word;
          let variant: Variant = "idle";
          if (chosen && status === "correct") variant = "correct";
          else if (chosen && status === "wrong") variant = "incorrect";
          else if (chosen && status === "selected") variant = "selected";
          else if (status === "correct") variant = "dim";
          return (
            <button
              key={word}
              type="button"
              disabled={disabled || status === "correct"}
              onClick={() => onPick(word)}
              className={cn(
                "min-h-[44px] rounded-xl border-2 px-4 py-2 font-mono text-[15px] font-bold transition disabled:cursor-default",
                VARIANT_CLASS[variant],
              )}
            >
              {word}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// Match the pairs
// ------------------------------------------------------------------------------------------------

/** Exam mode: one colour per pair, so crossing lines stay easy to follow. */
const PAIR_COLORS = ["#AA468E", "#2563EB", "#D97706", "#0891B2", "#7C3AED", "#DB2777"];
const MATCHED_GREEN = "#16A34A";
const WRONG_RED = "#DC2626";

type PairLine = { key: string; d: string; x1: number; y1: number; x2: number; y2: number; color: string; dashed?: boolean };

export function MatchPairsCard({
  prompt,
  language,
  left,
  right,
  matched,
  selectedLeft,
  wrong,
  revealed,
  disabled,
  onPickLeft,
  onPickRight,
  onReset,
}: {
  prompt: string;
  language?: string | null;
  left: { id: string; text: string }[];
  right: { token: string; text: string }[];
  /** left id -> right token. In learning mode only confirmed matches; in exam mode the learner's picks. */
  matched: Record<string, string>;
  selectedLeft: string | null;
  wrong: { left: string; right: string } | null;
  /** Learning mode: matched pairs are confirmed correct (green). Exam mode: neutral "paired". */
  revealed: boolean;
  disabled?: boolean;
  onPickLeft: (id: string) => void;
  onPickRight: (token: string) => void;
  onReset?: (() => void) | null;
}) {
  const pairedTokens = new Set(Object.values(matched));
  const tokenOwner = new Map(Object.entries(matched).map(([l, t]) => [t, l] as const));
  const done = Object.keys(matched).length === left.length;
  const boardRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef(new Map<string, HTMLButtonElement>());
  const rightRefs = useRef(new Map<string, HTMLButtonElement>());
  const [lines, setLines] = useState<PairLine[]>([]);

  const colorFor = useCallback(
    (leftId: string) => {
      if (revealed) return MATCHED_GREEN;
      const i = left.findIndex((l) => l.id === leftId);
      return PAIR_COLORS[Math.max(0, i) % PAIR_COLORS.length];
    },
    [left, revealed],
  );

  // Lines run from the right edge of a code card to the left edge of its description.
  const measure = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const box = board.getBoundingClientRect();
    const link = (leftId: string, token: string, color: string, dashed?: boolean): PairLine | null => {
      const a = leftRefs.current.get(leftId)?.getBoundingClientRect();
      const b = rightRefs.current.get(token)?.getBoundingClientRect();
      if (!a || !b) return null;
      const x1 = a.right - box.left;
      const y1 = a.top + a.height / 2 - box.top;
      const x2 = b.left - box.left;
      const y2 = b.top + b.height / 2 - box.top;
      const bend = Math.max(12, (x2 - x1) * 0.55);
      return {
        key: `${leftId}-${token}${dashed ? "-wrong" : ""}`,
        d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`,
        x1,
        y1,
        x2,
        y2,
        color,
        dashed,
      };
    };
    const next: PairLine[] = [];
    for (const [leftId, token] of Object.entries(matched)) {
      const line = link(leftId, token, colorFor(leftId));
      if (line) next.push(line);
    }
    if (wrong) {
      const line = link(wrong.left, wrong.right, WRONG_RED, true);
      if (line) next.push(line);
    }
    setLines(next);
  }, [matched, wrong, colorFor]);

  useLayoutEffect(() => {
    measure();
  }, [measure, left, right]);

  // Re-measure when the card resizes (window resize, text wrapping, fonts loading).
  useEffect(() => {
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(board);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
        <span className="shrink-0 rounded-full bg-[#F3EEF7] px-3 py-1 text-xs font-bold text-[#6B6572]">
          {Object.keys(matched).length} of {left.length} matched
        </span>
      </div>
      <p className="-mt-2 text-[13px] text-[#6B6572]">Tap a code card, then the description that goes with it.</p>
      <div ref={boardRef} className="relative grid grid-cols-2 gap-x-9 sm:gap-x-14">
        <div className="flex flex-col gap-2.5">
          {left.map((l) => {
            const isMatched = l.id in matched;
            const isWrong = wrong?.left === l.id;
            const isSelected = selectedLeft === l.id;
            return (
              <button
                key={l.id}
                ref={(el) => {
                  if (el) leftRefs.current.set(l.id, el);
                  else leftRefs.current.delete(l.id);
                }}
                type="button"
                disabled={disabled || (isMatched && revealed)}
                onClick={() => onPickLeft(l.id)}
                aria-pressed={isSelected}
                style={isMatched && !revealed ? { borderColor: colorFor(l.id) } : undefined}
                className={cn(
                  "relative min-h-[52px] break-words rounded-2xl border-2 px-3 py-3 text-left font-mono text-[13px] font-semibold sm:px-4 sm:text-[14px] transition disabled:cursor-default",
                  isMatched && revealed && "border-[#16A34A] bg-[#ECFDF3] text-[#15803D]",
                  isMatched && !revealed && "bg-[#2A2540] text-[#E9E4F0]",
                  !isMatched && isWrong && "animate-[tests-shake_0.35s] border-[#DC2626] bg-[#3A1620] text-[#FCA5A5]",
                  !isMatched && !isWrong && isSelected && "border-primary bg-[#1E1B2E] text-white ring-[3px] ring-primary/30",
                  !isMatched && !isWrong && !isSelected && "border-[#1E1B2E] bg-[#1E1B2E] text-[#E9E4F0] hover:border-primary/60",
                )}
              >
                {isMatched && revealed ? l.text : <InlineCode code={l.text} language={language} />}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2.5">
          {right.map((r) => {
            const isMatched = pairedTokens.has(r.token);
            const isWrong = wrong?.right === r.token;
            const owner = tokenOwner.get(r.token);
            return (
              <button
                key={r.token}
                ref={(el) => {
                  if (el) rightRefs.current.set(r.token, el);
                  else rightRefs.current.delete(r.token);
                }}
                type="button"
                disabled={disabled || (isMatched && revealed) || (!selectedLeft && !isMatched)}
                onClick={() => onPickRight(r.token)}
                style={isMatched && !revealed && owner ? { borderColor: colorFor(owner) } : undefined}
                className={cn(
                  "relative min-h-[52px] rounded-2xl border-2 px-3 py-3 text-left text-[13px] font-semibold sm:px-4 sm:text-[14px] transition disabled:cursor-default",
                  isMatched && revealed && "border-[#16A34A] bg-[#ECFDF3] text-[#15803D]",
                  isMatched && !revealed && "bg-[#FBF5FC] text-[#1F1B24]",
                  !isMatched && isWrong && "animate-[tests-shake_0.35s] border-[#DC2626] bg-[#FEF2F2] text-[#B91C1C]",
                  !isMatched && !isWrong && "border-[#ECE6F0] bg-white text-[#1F1B24]",
                  !isMatched && !isWrong && selectedLeft && "hover:border-primary/50 hover:bg-[#FBF5FC]",
                )}
              >
                {r.text}
              </button>
            );
          })}
        </div>
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {lines.map((line) => (
            <g key={line.key} className={line.dashed ? undefined : "tests-line-in"}>
              <path
                d={line.d}
                fill="none"
                stroke={line.color}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={line.dashed ? "6 6" : undefined}
              />
              <circle cx={line.x1} cy={line.y1} r={5} fill="#fff" stroke={line.color} strokeWidth={3} />
              <circle cx={line.x2} cy={line.y2} r={5} fill="#fff" stroke={line.color} strokeWidth={3} />
            </g>
          ))}
        </svg>
      </div>
      {onReset && Object.keys(matched).length > 0 && !(done && revealed) ? (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-[#6B6572] hover:text-primary"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Clear my pairs
        </button>
      ) : null}
    </>
  );
}
