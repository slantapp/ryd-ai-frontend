/**
 * Card bodies for the 11 additional AI test question types.
 */
import { useCallback, useEffect, useRef } from "react";
import { Check, Eye, EyeOff, Play, RotateCcw, Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock, InlineCode } from "./CodeBlock";
import { VARIANT_CLASS, type Variant } from "./cardStyles";
import type { QuestionOption } from "../types";
import { ChoiceCard } from "./QuestionCards";

// ------------------------------------------------------------------------------------------------
// Shared
// ------------------------------------------------------------------------------------------------

function CheckButton({
  onClick,
  disabled,
  label = "Check answer",
  wrong,
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  wrong?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "mt-2 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border-2 px-4 py-3 text-[15px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50",
        wrong
          ? "animate-[tests-shake_0.35s] border-[#DC2626] bg-[#DC2626] text-white"
          : "border-primary bg-primary text-white hover:brightness-110",
      )}
    >
      {label}
    </button>
  );
}

// ------------------------------------------------------------------------------------------------
// order_lines
// ------------------------------------------------------------------------------------------------

export function OrderLinesCard({
  prompt,
  language,
  lines,
  slotCount,
  order,
  usedIds,
  revealed,
  disabled,
  checkWrong,
  canCheck,
  onAdd,
  onRemove,
  onCheck,
}: {
  prompt: string;
  language?: string | null;
  lines: { id: string; text: string }[];
  slotCount: number;
  order: string[];
  usedIds: Set<string>;
  revealed: boolean;
  disabled?: boolean;
  checkWrong?: boolean;
  canCheck: boolean;
  onAdd: (id: string) => void;
  onRemove: (index: number) => void;
  onCheck: () => void;
}) {
  const pool = lines.filter((l) => !usedIds.has(l.id));
  const byId = new Map(lines.map((l) => [l.id, l]));
  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <p className="text-[13px] text-[#6B6572]">Tap lines below to fill the slots in order. Tap a slot to remove a line.</p>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {Array.from({ length: slotCount }, (_, i) => {
          const id = order[i];
          const line = id ? byId.get(id) : null;
          return (
            <li key={i}>
              <button
                type="button"
                disabled={disabled || revealed || !id}
                onClick={() => id && onRemove(i)}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-semibold transition disabled:cursor-default",
                  // Dark panels so InlineCode token colours stay readable (same as the flashcard guide).
                  line && !revealed && "border-[#1E1B2E] bg-[#1E1B2E] text-[#E9E4F0] hover:border-primary/70",
                  line && revealed && !checkWrong && "border-[#16A34A] bg-[#12351F] text-[#E9E4F0]",
                  line && revealed && checkWrong && "border-[#DC2626] bg-[#3F1D22] text-[#E9E4F0]",
                  !line && "border-dashed border-[#D4C4DC] bg-[#FBF5FC] text-[#9C96A6]",
                )}
              >
                <span
                  className={cn(
                    "flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                    line ? "bg-[#3A3442] text-[#F5EEF8]" : "bg-[#F3EEF7] text-[#6B6572]",
                  )}
                >
                  {i + 1}
                </span>
                {line ? (
                  <span className="flex-1 font-mono text-[14px]">
                    <InlineCode code={line.text} language={language} />
                  </span>
                ) : (
                  <span className="flex-1 italic">Empty slot</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2">
        {pool.map((l) => (
          <button
            key={l.id}
            type="button"
            disabled={disabled || revealed || order.length >= slotCount}
            onClick={() => onAdd(l.id)}
            className="min-h-[48px] rounded-2xl border-2 border-[#1E1B2E] bg-[#1E1B2E] px-4 py-3 text-left font-mono text-[14px] font-semibold text-[#E9E4F0] transition hover:border-primary/60 disabled:cursor-default disabled:opacity-50"
          >
            <InlineCode code={l.text} language={language} />
          </button>
        ))}
      </div>
      {canCheck && !revealed ? <CheckButton onClick={onCheck} disabled={disabled} wrong={checkWrong} label="Check order" /> : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// build_answer
// ------------------------------------------------------------------------------------------------

export function BuildAnswerCard({
  prompt,
  tiles,
  sequence,
  revealed,
  disabled,
  checkWrong,
  canCheck,
  onToggle,
  onClear,
  onCheck,
}: {
  prompt: string;
  tiles: { id: string; text: string }[];
  sequence: string[];
  revealed: boolean;
  disabled?: boolean;
  checkWrong?: boolean;
  canCheck: boolean;
  onToggle: (id: string) => void;
  onClear: () => void;
  onCheck: () => void;
}) {
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const built = sequence.map((id) => byId.get(id)?.text ?? "").join("");
  const inBuild = new Set(sequence);
  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <div
        className={cn(
          "min-h-[56px] rounded-2xl border-2 px-4 py-3 text-center font-mono text-lg font-bold",
          revealed ? VARIANT_CLASS.correct : "border-primary bg-[#FBF5FC] text-[#1F1B24]",
        )}
      >
        {built || <span className="text-[#9C96A6]">Tap tiles to build your answer</span>}
      </div>
      <div className="flex flex-wrap justify-center gap-2.5">
        {tiles.map((t) => {
          const picked = inBuild.has(t.id);
          const variant: Variant = picked ? "dim" : revealed ? "dim" : "idle";
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled || revealed}
              onClick={() => onToggle(t.id)}
              className={cn(
                "min-h-[44px] rounded-xl border-2 px-4 py-2 font-mono text-[15px] font-bold transition disabled:cursor-default",
                VARIANT_CLASS[variant],
              )}
            >
              {t.text}
            </button>
          );
        })}
      </div>
      {sequence.length > 0 && !revealed ? (
        <button
          type="button"
          onClick={onClear}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-[#6B6572] hover:text-primary"
        >
          <RotateCcw className="size-3.5" aria-hidden /> Clear build
        </button>
      ) : null}
      {canCheck && !revealed ? <CheckButton onClick={onCheck} disabled={disabled} wrong={checkWrong} label="Check build" /> : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// spot_mistake
// ------------------------------------------------------------------------------------------------

export function SpotMistakeCard({
  prompt,
  steps,
  selected,
  correctIndex,
  revealed,
  disabled,
  onPick,
}: {
  prompt: string;
  language?: string | null;
  steps: string[];
  selected: number | null;
  correctIndex?: number | null;
  revealed: boolean;
  disabled?: boolean;
  onPick: (index: number) => void;
}) {
  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <p className="text-[13px] text-[#6B6572]">Which step has the mistake?</p>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {steps.map((step, i) => {
          let variant: Variant = selected === i ? "selected" : "idle";
          if (revealed) {
            if (correctIndex != null && i === correctIndex) variant = "correct";
            else if (i === selected) variant = "incorrect";
            else variant = "dim";
          }
          return (
            <li key={i}>
              <button
                type="button"
                disabled={disabled || revealed}
                onClick={() => onPick(i)}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-semibold transition disabled:cursor-default",
                  VARIANT_CLASS[variant],
                )}
              >
                <span
                  className={cn(
                    "flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                    variant === "correct" && "bg-[#DCFCE7] text-[#15803D]",
                    variant === "incorrect" && "bg-[#FEE2E2] text-[#B91C1C]",
                    variant === "selected" && "bg-primary/15 text-primary",
                    (variant === "idle" || variant === "dim") && "bg-[#F3EEF7] text-[#6B6572]",
                  )}
                >
                  {i + 1}
                </span>
                {/* Plain dark mono — steps are often formulas; InlineCode token colours wash out on light chips. */}
                <span className="flex-1 break-words font-mono text-[14px] font-semibold leading-snug">{step}</span>
                {variant === "correct" ? <Check className="size-5 shrink-0 text-[#16A34A]" aria-hidden /> : null}
                {variant === "incorrect" ? <X className="size-5 shrink-0 text-[#DC2626]" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// select_all
// ------------------------------------------------------------------------------------------------

export function SelectAllCard({
  prompt,
  options,
  selected,
  correctIds,
  revealed,
  disabled,
  checkWrong,
  canCheck,
  onToggle,
  onCheck,
}: {
  prompt: string;
  options: QuestionOption[];
  selected: string[];
  correctIds?: string[] | null;
  revealed: boolean;
  disabled?: boolean;
  checkWrong?: boolean;
  canCheck: boolean;
  onToggle: (id: string) => void;
  onCheck: () => void;
}) {
  const picked = new Set(selected);
  const right = new Set(correctIds ?? []);
  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <p className="text-[13px] text-[#6B6572]">Select every option that applies, then check.</p>
      <div className="flex flex-col gap-2.5">
        {options.map((o) => {
          const on = picked.has(o.id);
          let variant: Variant = on ? "selected" : "idle";
          if (revealed && right.size > 0) {
            if (right.has(o.id)) variant = "correct";
            else if (on) variant = "incorrect";
            else variant = "dim";
          }
          return (
            <button
              key={o.id}
              type="button"
              disabled={disabled || revealed}
              onClick={() => onToggle(o.id)}
              className={cn(
                "flex min-h-[52px] w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-semibold transition disabled:cursor-default",
                VARIANT_CLASS[variant],
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md border-2",
                  on ? "border-primary bg-primary text-white" : "border-[#D4C4DC] bg-white",
                )}
                aria-hidden
              >
                {on ? <Check className="size-4" strokeWidth={3} /> : null}
              </span>
              <span className="flex-1">{o.label}</span>
            </button>
          );
        })}
      </div>
      {canCheck && !revealed ? <CheckButton onClick={onCheck} disabled={disabled} wrong={checkWrong} /> : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// type_output
// ------------------------------------------------------------------------------------------------

const NUM_PAD = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫"];

export function TypeOutputCard({
  prompt,
  code,
  language,
  maxLength,
  keypad,
  value,
  revealed,
  disabled,
  checkWrong,
  canCheck,
  onChange,
  onCheck,
}: {
  prompt: string;
  code?: string | null;
  language?: string | null;
  maxLength: number;
  keypad: "numeric" | "text";
  value: string;
  revealed: boolean;
  disabled?: boolean;
  checkWrong?: boolean;
  canCheck: boolean;
  onChange: (v: string) => void;
  onCheck: () => void;
}) {
  return (
    <>
      {code ? <CodeBlock code={code} language={language} /> : null}
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <div
        className={cn(
          "rounded-2xl border-2 px-4 py-4 text-center font-mono text-2xl font-extrabold tracking-widest",
          revealed ? VARIANT_CLASS.correct : "border-primary bg-[#1E1B2E] text-[#E9E4F0]",
        )}
      >
        {value || <span className="text-[#6B6572]">?</span>}
      </div>
      {keypad === "text" ? (
        <input
          type="text"
          value={value}
          disabled={disabled || revealed}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
          className="w-full rounded-xl border-2 border-[#ECE6F0] px-4 py-3 font-mono text-[15px] font-semibold focus:border-primary focus:outline-none"
          placeholder={`Up to ${maxLength} characters`}
        />
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {NUM_PAD.map((k) => (
            <button
              key={k}
              type="button"
              disabled={disabled || revealed}
              onClick={() => {
                if (k === "⌫") onChange(value.slice(0, -1));
                else if (value.length < maxLength) onChange(value + k);
              }}
              className={cn(
                "min-h-[48px] rounded-xl border-2 font-mono text-lg font-bold transition disabled:cursor-default",
                VARIANT_CLASS.idle,
              )}
            >
              {k}
            </button>
          ))}
        </div>
      )}
      {canCheck && !revealed ? <CheckButton onClick={onCheck} disabled={disabled || !value.trim()} wrong={checkWrong} /> : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// place_on_line
// ------------------------------------------------------------------------------------------------

export function PlaceOnLineCard({
  prompt,
  ticks,
  leftLabel,
  rightLabel,
  value,
  correctValue,
  revealed,
  disabled,
  checkWrong,
  canCheck,
  onChange,
  onCheck,
}: {
  prompt: string;
  ticks: number;
  leftLabel: string;
  rightLabel: string;
  value: number | null;
  correctValue?: number | null;
  revealed: boolean;
  disabled?: boolean;
  checkWrong?: boolean;
  canCheck: boolean;
  onChange: (v: number) => void;
  onCheck: () => void;
}) {
  const v = value ?? Math.floor(ticks / 2);
  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <div className="px-1 pt-2">
        <input
          type="range"
          min={0}
          max={ticks}
          step={1}
          value={v}
          disabled={disabled || revealed}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
          aria-valuemin={0}
          aria-valuemax={ticks}
          aria-valuenow={v}
        />
        <div className="mt-1 flex justify-between text-[13px] font-semibold text-[#6B6572]">
          <span>{leftLabel}</span>
          <span className="tabular-nums text-primary">{v}</span>
          <span>{rightLabel}</span>
        </div>
      </div>
      {revealed && correctValue != null ? (
        <p className="text-center text-[13px] font-semibold text-[#15803D]">Correct position: {correctValue}</p>
      ) : null}
      {canCheck && !revealed ? <CheckButton onClick={onCheck} disabled={disabled || value == null} wrong={checkWrong} /> : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// sort_buckets
// ------------------------------------------------------------------------------------------------

export function SortBucketsCard({
  prompt,
  items,
  buckets,
  map,
  revealed,
  disabled,
  checkWrong,
  canCheck,
  onPick,
  onCheck,
}: {
  prompt: string;
  items: { id: string; text: string }[];
  buckets: { id: string; label: string }[];
  map: Record<string, string>;
  revealed: boolean;
  disabled?: boolean;
  checkWrong?: boolean;
  canCheck: boolean;
  onPick: (itemId: string, bucketId: string) => void;
  onCheck: () => void;
}) {
  const allSorted = items.every((i) => map[i.id]);
  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <p className="text-[13px] text-[#6B6572]">Put each item in the right bucket.</p>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[#ECE6F0] bg-[#FAFAFA] p-3">
            <p className="m-0 mb-2 text-[14px] font-semibold text-[#1F1B24]">{item.text}</p>
            <div className="flex flex-wrap gap-2">
              {buckets.map((b) => {
                const on = map[item.id] === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={disabled || revealed}
                    onClick={() => onPick(item.id, b.id)}
                    className={cn(
                      "rounded-xl border-2 px-3 py-1.5 text-[13px] font-bold transition disabled:cursor-default",
                      on ? VARIANT_CLASS.selected : VARIANT_CLASS.idle,
                    )}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {canCheck && !revealed ? (
        <CheckButton onClick={onCheck} disabled={disabled || !allSorted} wrong={checkWrong} label="Check sorting" />
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// listen_answer
// ------------------------------------------------------------------------------------------------

export function ListenAnswerCard({
  prompt,
  spokenText,
  showTextAllowed,
  options,
  selected,
  correctAnswer,
  revealed,
  disabled,
  showText,
  onToggleShow,
  onPick,
}: {
  prompt: string;
  spokenText: string;
  showTextAllowed: boolean;
  options: QuestionOption[];
  selected: string | null;
  correctAnswer?: string | null;
  revealed: boolean;
  disabled?: boolean;
  showText: boolean;
  onToggleShow: () => void;
  onPick: (id: string) => void;
}) {
  const spoke = useRef(false);
  const speak = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onToggleShow();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(spokenText);
    window.speechSynthesis.speak(u);
    spoke.current = true;
  }, [spokenText, onToggleShow]);

  useEffect(() => {
    if (revealed || disabled) return;
    const t = window.setTimeout(() => speak(), 400);
    return () => window.clearTimeout(t);
  }, [speak, revealed, disabled]);

  const noTts = typeof window !== "undefined" && !window.speechSynthesis;
  const displayText = showText || noTts;

  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={speak}
          disabled={disabled || revealed}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
        >
          <Volume2 className="size-4" aria-hidden />
          Listen again
        </button>
        {showTextAllowed ? (
          <button
            type="button"
            onClick={onToggleShow}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#ECE6F0] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#6B6572] hover:border-primary/40"
          >
            {displayText ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
            {displayText ? "Hide words" : "Show words"}
          </button>
        ) : null}
      </div>
      {displayText ? (
        <p className="rounded-2xl bg-[#FBF5FC] px-5 py-4 text-center text-lg font-bold text-[#1F1B24]">{spokenText}</p>
      ) : (
        <p className="text-center text-[13px] text-[#6B6572]">Listen carefully, then pick your answer.</p>
      )}
      <ChoiceCard
        prompt=""
        options={options}
        selected={selected}
        correctAnswer={correctAnswer}
        revealed={revealed}
        disabled={disabled}
        onPick={onPick}
      />
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// trace_steps
// ------------------------------------------------------------------------------------------------

export function TraceStepsCard({
  prompt,
  language,
  lines,
  steps,
  values,
  revealed,
  disabled,
  canCheck,
  onSet,
  onCheck,
}: {
  prompt: string;
  language?: string | null;
  lines: string[];
  steps: { options: (string | number)[]; hint: string | null }[];
  values: (string | number)[];
  revealed: boolean;
  disabled?: boolean;
  canCheck: boolean;
  onSet: (index: number, v: string | number) => void;
  onCheck: () => void;
}) {
  const code = lines.join("\n");
  const complete = values.length === steps.length && values.every((v) => v !== "" && v != null);
  return (
    <>
      {code ? <CodeBlock code={code} language={language} /> : null}
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {steps.map((step, i) => (
          <li key={i} className="rounded-2xl border border-[#ECE6F0] bg-[#FAFAFA] p-3">
            <p className="m-0 mb-2 text-[13px] font-bold text-[#6B6572]">Step {i + 1}</p>
            {step.hint ? <p className="m-0 mb-2 text-[12px] text-[#9C96A6]">{step.hint}</p> : null}
            <div className="flex flex-wrap gap-2">
              {step.options.map((opt) => {
                const id = String(opt);
                const on = String(values[i]) === id;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={disabled || revealed}
                    onClick={() => onSet(i, opt)}
                    className={cn(
                      "min-h-[40px] rounded-xl border-2 px-3 py-1.5 font-mono text-[14px] font-bold transition disabled:cursor-default",
                      on ? VARIANT_CLASS.selected : VARIANT_CLASS.idle,
                    )}
                  >
                    {id}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      {canCheck && !revealed ? (
        <CheckButton onClick={onCheck} disabled={disabled || !complete} label="Check trace" />
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// spot_bug
// ------------------------------------------------------------------------------------------------

export type SpotBugStage = "run" | "line" | "fix";

export function SpotBugCard({
  prompt,
  language,
  lines,
  expectedOutput,
  actualOutput,
  clue,
  fixes,
  stage,
  line,
  fixId,
  revealed,
  disabled,
  onRun,
  onPickLine,
  onPickFix,
  onSubmit,
  canSubmit,
}: {
  prompt: string;
  language?: string | null;
  lines: string[];
  expectedOutput: string;
  actualOutput: string;
  clue: string | null;
  fixes: { id: string; text: string; output: string | null }[];
  stage: SpotBugStage;
  line: number | null;
  fixId: string | null;
  revealed: boolean;
  disabled?: boolean;
  onRun: () => void;
  onPickLine: (index: number) => void;
  onPickFix: (id: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const code = lines.join("\n");
  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      {code ? <CodeBlock code={code} language={language} /> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-[#ECFDF3] px-3 py-2 text-[13px]">
          <span className="font-bold text-[#15803D]">Expected</span>
          <pre className="m-0 mt-1 whitespace-pre-wrap font-mono text-[#132050]">{expectedOutput}</pre>
        </div>
        <div className="rounded-xl bg-[#FEF2F2] px-3 py-2 text-[13px]">
          <span className="font-bold text-[#B91C1C]">Actual</span>
          <pre className="m-0 mt-1 whitespace-pre-wrap font-mono text-[#132050]">{actualOutput}</pre>
        </div>
      </div>
      {clue && stage !== "run" ? <p className="rounded-xl bg-[#FFFBEB] px-3 py-2 text-[13px] text-[#92400E]">{clue}</p> : null}
      {stage === "run" ? (
        <button
          type="button"
          onClick={onRun}
          disabled={disabled || revealed}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-primary px-5 py-3 text-[15px] font-extrabold text-white"
        >
          <Play className="size-4" aria-hidden /> Run and find the bug
        </button>
      ) : null}
      {stage === "line" || stage === "fix" || revealed ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[13px] font-semibold text-[#6B6572]">Which line is wrong?</p>
          {lines.map((ln, i) => (
            <button
              key={i}
              type="button"
              disabled={disabled || revealed || stage === "fix"}
              onClick={() => onPickLine(i)}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-left font-mono text-[13px] font-semibold transition disabled:cursor-default",
                line === i ? VARIANT_CLASS.selected : VARIANT_CLASS.idle,
              )}
            >
              <span className="mr-2 font-bold text-[#9C96A6]">{i + 1}</span>
              {ln}
            </button>
          ))}
        </div>
      ) : null}
      {stage === "fix" || revealed ? (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-[13px] font-semibold text-[#6B6572]">Pick a fix</p>
          {fixes.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={disabled || revealed}
              onClick={() => onPickFix(f.id)}
              className={cn(
                "rounded-2xl border-2 px-4 py-3 text-left text-[14px] font-semibold transition disabled:cursor-default",
                fixId === f.id ? VARIANT_CLASS.selected : VARIANT_CLASS.idle,
              )}
            >
              {f.text}
            </button>
          ))}
        </div>
      ) : null}
      {canSubmit && !revealed ? <CheckButton onClick={onSubmit} disabled={disabled} label="Submit fix" /> : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// speed_round
// ------------------------------------------------------------------------------------------------

export function SpeedRoundCard({
  prompt,
  seconds,
  facts,
  results,
  remainingSec,
  revealed,
  disabled,
  onPick,
  started,
  onStart,
}: {
  prompt: string;
  seconds: number;
  facts: { id: string; prompt: string }[];
  results: { id: string; value: boolean }[];
  remainingSec: number;
  revealed: boolean;
  disabled?: boolean;
  onPick: (id: string, value: boolean) => void;
  started: boolean;
  onStart: () => void;
}) {
  const answeredIds = new Set(results.map((r) => r.id));
  const current = facts.find((f) => !answeredIds.has(f.id)) ?? null;
  const index = current ? facts.findIndex((f) => f.id === current.id) : facts.length;
  const done = results.length === facts.length;
  const pct = Math.max(0, Math.min(100, Math.round((remainingSec / Math.max(1, seconds)) * 100)));

  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      {!started ? (
        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          className="rounded-2xl border-2 border-primary bg-primary px-5 py-3 text-[15px] font-extrabold text-white"
        >
          Start — {seconds}s on the clock
        </button>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <p
                className={cn(
                  "m-0 font-solway text-3xl font-extrabold tabular-nums",
                  remainingSec <= 5 ? "text-[#DC2626]" : "text-primary",
                )}
                aria-live="polite"
              >
                {remainingSec}s
              </p>
              <span className="rounded-full bg-[#F3EEF7] px-3 py-1 text-xs font-bold text-[#6B6572]">
                {Math.min(index + 1, facts.length)} of {facts.length}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E9E0EF]" aria-hidden>
              <div
                className={cn("h-full rounded-full transition-[width] duration-200", remainingSec <= 5 ? "bg-[#DC2626]" : "bg-primary")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {done || !current ? (
            <p className="rounded-2xl bg-[#ECFDF3] px-4 py-6 text-center text-[15px] font-semibold text-[#15803D]">
              All facts answered — saving…
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-[#FBF5FC] px-5 py-8 text-center text-lg font-bold text-[#1F1B24] sm:text-xl">
                {current.prompt}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[false, true].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    disabled={disabled || revealed}
                    onClick={() => onPick(current.id, v)}
                    className={cn(
                      "flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border-2 text-base font-extrabold transition disabled:cursor-default",
                      v
                        ? "border-[#86EFAC] bg-white text-[#15803D] hover:bg-[#F0FDF4]"
                        : "border-[#FCA5A5] bg-white text-[#B91C1C] hover:bg-[#FEF2F2]",
                    )}
                  >
                    {v ? <Check className="size-5" strokeWidth={2.6} aria-hidden /> : <X className="size-5" strokeWidth={2.6} aria-hidden />}
                    {v ? "True" : "False"}
                  </button>
                ))}
              </div>
              <p className="m-0 text-center text-[13px] text-[#6B6572]">Tap an answer to move on straight away</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
