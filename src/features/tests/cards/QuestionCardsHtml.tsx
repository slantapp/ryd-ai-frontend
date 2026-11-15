/**
 * HTML/CSS interactive-test cards: tap_element, css_cascade, match_design.
 * One Check → reveal → Next (house rule), even when the design guide mentioned free retries.
 */
import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./CodeBlock";
import { LivePreviewBox } from "./LivePreviewBox";
import { VARIANT_CLASS, type Variant } from "./cardStyles";
import type { QuestionOption } from "../types";

const LETTERS = "ABCD";

type TapTarget = {
  id: string;
  label: string;
  tag: string;
  /** Visual weight from the tag (h1–h3 heavier). */
  size: string;
  weight: string;
};

type TapBlock =
  | { kind: "group"; key: string; items: TapTarget[] }
  | { kind: "item"; key: string; item: TapTarget };

function tapLabel(el: Element): string {
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  return text || `<${el.tagName.toLowerCase()}>`;
}

function tapMeta(el: Element): TapTarget {
  const tag = el.tagName.toLowerCase();
  const heading = /^h[1-3]$/.test(tag);
  return {
    id: el.getAttribute("data-tap") || "",
    label: tapLabel(el),
    tag,
    size: heading ? "16px" : "14px",
    weight: heading ? "800" : "600",
  };
}

/**
 * Build the Page layout from authored HTML: groups (e.g. .card wrappers) and
 * top-level tappable nodes — matching the design HTML “Page” chrome.
 */
function tapBlocksFromPage(page: string): TapBlock[] {
  if (typeof DOMParser === "undefined") {
    const flat: TapTarget[] = [];
    const re = /<([a-z0-9]+)\b[^>]*\bdata-tap\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/\1>/gi;
    let m;
    while ((m = re.exec(page))) {
      const tag = m[1].toLowerCase();
      const text = m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      flat.push({
        id: m[2],
        label: text || `<${tag}>`,
        tag,
        size: /^h[1-3]$/.test(tag) ? "16px" : "14px",
        weight: /^h[1-3]$/.test(tag) ? "800" : "600",
      });
    }
    return flat.map((item) => ({ kind: "item", key: item.id, item }));
  }
  const doc = new DOMParser().parseFromString(`<div id="ryd-root">${page}</div>`, "text/html");
  const root = doc.getElementById("ryd-root") || doc.body;
  const blocks: TapBlock[] = [];
  Array.from(root.children).forEach((node, i) => {
    if (!(node instanceof Element)) return;
    if (node.hasAttribute("data-tap")) {
      const item = tapMeta(node);
      if (item.id) blocks.push({ kind: "item", key: item.id, item });
      return;
    }
    const taps = Array.from(node.querySelectorAll("[data-tap]")).map(tapMeta).filter((t) => t.id);
    if (taps.length) {
      blocks.push({ kind: "group", key: `g${i}`, items: taps });
    }
  });
  // Fallback: flat list if markup had no top-level structure.
  if (!blocks.length) {
    Array.from(root.querySelectorAll("[data-tap]"))
      .map(tapMeta)
      .filter((t) => t.id)
      .forEach((item) => blocks.push({ kind: "item", key: item.id, item }));
  }
  return blocks;
}

function tapButtonStyle(
  item: TapTarget,
  opts: { picked: boolean; revealed: boolean; correct: boolean },
): { border: string; bg: string; noteBg: string; dim: boolean } {
  const { picked, revealed, correct } = opts;
  if (revealed) {
    if (correct && picked) return { border: "2px solid #16A34A", bg: "#ECFDF3", noteBg: "#16A34A", dim: false };
    if (picked && !correct) return { border: "2px solid #DC2626", bg: "#FEF2F2", noteBg: "#DC2626", dim: false };
    if (correct && !picked) return { border: "2px dashed #16A34A", bg: "#F0FDF4", noteBg: "#16A34A", dim: false };
    return { border: "1px solid #ECE6F0", bg: "#FAFAFA", noteBg: "#9CA3AF", dim: true };
  }
  if (picked) return { border: "2px solid #A8358C", bg: "#FBF5FC", noteBg: "#A8358C", dim: false };
  return { border: "1px solid #E6E0EC", bg: "#FFFFFF", noteBg: "#A8358C", dim: false };
}

// ------------------------------------------------------------------------------------------------
// Tap the element — Page chrome with tappable elements (design HTML)
// ------------------------------------------------------------------------------------------------

export function TapElementCard({
  prompt,
  code,
  language,
  page,
  mode,
  selected,
  correctIds,
  tapNotes,
  revealed,
  disabled,
  onChange,
  onCheck,
}: {
  prompt: string;
  code?: string | null;
  language?: string | null;
  page: string;
  pageCss?: string | null;
  mode: "single" | "multi";
  selected: string[];
  correctIds?: string[] | null;
  tapNotes?: Record<string, string> | null;
  revealed: boolean;
  disabled?: boolean;
  onChange: (ids: string[]) => void;
  onCheck: () => void;
}) {
  const blocks = useMemo(() => tapBlocksFromPage(page), [page]);
  const correct = useMemo(() => new Set(correctIds ?? []), [correctIds]);
  const picked = useMemo(() => new Set(selected), [selected]);

  const toggle = (id: string) => {
    if (disabled || revealed) return;
    if (mode === "single") {
      onChange([id]);
      return;
    }
    onChange(picked.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const renderTap = (item: TapTarget, outside = false) => {
    const isPicked = picked.has(item.id);
    const isCorrect = correct.has(item.id);
    const style = tapButtonStyle(item, { picked: isPicked, revealed, correct: isCorrect });
    const note = revealed ? tapNotes?.[item.id] : null;
    const missed = revealed && isCorrect && !isPicked;
    return (
      <button
        key={item.id}
        type="button"
        aria-pressed={isPicked}
        disabled={disabled || revealed}
        onClick={() => toggle(item.id)}
        className="relative flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-1.5 text-left transition disabled:cursor-default"
        style={{
          border: style.border,
          background: style.bg,
          fontSize: outside ? "13px" : item.size,
          fontWeight: outside ? 500 : Number(item.weight),
          color: outside ? "#5C5872" : style.dim ? "#B7B2C0" : "#1B1838",
          opacity: style.dim ? 0.7 : 1,
        }}
      >
        <span>{item.label}</span>
        {note ? (
          <span
            className="shrink-0 whitespace-nowrap rounded-[5px] px-1.5 py-0.5 text-[10.5px] font-extrabold text-white"
            style={{ background: style.noteBg }}
          >
            {missed ? `Missed · ${note}` : note}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <>
      {code ? <CodeBlock code={code} language={language} /> : null}
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>

      <div className="overflow-hidden rounded-[18px] border-2 border-[#EEE9F3]">
        <div className="flex items-center gap-1.5 bg-[#F4F1F7] px-3 py-2 text-[11.5px] font-semibold text-[#6D6985]">
          <span className="size-[7px] rounded-full bg-[#D6CDE0]" />
          <span className="size-[7px] rounded-full bg-[#D6CDE0]" />
          <span className="size-[7px] rounded-full bg-[#D6CDE0]" />
          <span className="ml-1">Page</span>
        </div>
        <div className="flex flex-col gap-2.5 bg-white p-3.5">
          {blocks.map((block) =>
            block.kind === "group" ? (
              <div
                key={block.key}
                className="flex flex-col gap-1.5 rounded-[14px] border border-[#E6E0EC] bg-[#FCFAFD] p-2.5"
              >
                {block.items.map((item) => renderTap(item))}
              </div>
            ) : (
              renderTap(block.item, true)
            ),
          )}
        </div>
      </div>

      {!revealed ? (
        <>
          <p className="m-0 text-[12.5px] text-[#6D6985]">
            Tap to select, tap again to undo · {selected.length} selected
          </p>
          <button
            type="button"
            disabled={disabled || selected.length === 0}
            onClick={onCheck}
            className="min-h-[48px] w-full rounded-2xl bg-primary px-5 text-[15px] font-extrabold text-white transition disabled:cursor-default disabled:opacity-40"
          >
            Check
          </button>
        </>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// Which rule wins (css_cascade)
// ------------------------------------------------------------------------------------------------

export function CssCascadeCard({
  prompt,
  html,
  property,
  rules,
  options,
  selected,
  correctAnswer,
  winnerId,
  ruleNotes,
  showResult,
  revealed,
  disabled,
  onPick,
}: {
  prompt: string;
  html: string;
  property: string;
  rules: { id: string; css: string }[];
  options: (QuestionOption & { swatch?: string })[];
  selected: string | null;
  correctAnswer?: string | null;
  winnerId?: string | null;
  ruleNotes?: Record<string, string> | null;
  showResult?: boolean;
  revealed: boolean;
  disabled?: boolean;
  onPick: (id: string) => void;
}) {
  const combinedCss = useMemo(() => rules.map((r) => r.css).join("\n"), [rules]);

  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <div className="rounded-2xl bg-[#1E1B2E] px-4 py-3 font-mono text-[13px] text-[#E9E4F0]">
        <div className="mb-2 text-[#A78BFA]">{html}</div>
        <div className="text-[11px] uppercase tracking-wide text-[#6B6572]">property: {property}</div>
      </div>
      <div className="flex flex-col gap-2">
        {rules.map((r) => {
          const isWinner = revealed && winnerId === r.id;
          const note = revealed ? ruleNotes?.[r.id] : null;
          return (
            <div
              key={r.id}
              className={cn(
                "rounded-xl border-2 px-3 py-2 font-mono text-[13px]",
                isWinner
                  ? "border-[#16A34A] bg-[#ECFDF3] text-[#15803D]"
                  : revealed
                    ? "border-[#ECE6F0] bg-[#FAFAFA] text-[#9CA3AF] line-through"
                    : "border-[#ECE6F0] bg-white text-[#1F1B24]",
              )}
            >
              <div>{r.css}</div>
              {note ? <div className="mt-1 font-sans text-[12px] font-semibold no-underline">{note}</div> : null}
            </div>
          );
        })}
      </div>
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
              {o.swatch ? (
                <span
                  className="size-[26px] shrink-0 rounded-full border border-black/10"
                  style={{ background: o.swatch }}
                  aria-hidden
                />
              ) : (
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-[#F3EEF7] text-xs font-extrabold text-[#6B6572]">
                  {LETTERS[i] ?? o.id.toUpperCase()}
                </span>
              )}
              <span className="flex-1">{o.label}</span>
              {variant === "correct" ? <Check className="size-5 shrink-0 text-[#16A34A]" strokeWidth={2.6} /> : null}
              {variant === "incorrect" ? <X className="size-5 shrink-0 text-[#DC2626]" strokeWidth={2.6} /> : null}
            </button>
          );
        })}
      </div>
      {revealed && showResult ? (
        <div className="mt-1 overflow-hidden rounded-2xl border border-[#E6E0EC] bg-[#FAF8FC]">
          <div className="px-3.5 pt-2.5 text-[11px] font-extrabold uppercase tracking-wide text-[#6B6572]">
            Result
          </div>
          <LivePreviewBox
            html={html}
            css={combinedCss}
            mode="stage"
            className="h-[104px] rounded-none border-0"
            style={{ border: 0 }}
            title="Final result"
          />
        </div>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------------------------------------------
// Match the design
// ------------------------------------------------------------------------------------------------

function blankCss(selector: string, picks: Record<string, string>): string {
  const body = Object.entries(picks)
    .map(([prop, val]) => `  ${prop}: ${val};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
}

export function MatchDesignCard({
  prompt,
  html,
  baseCss,
  selector,
  targetCss,
  blanks,
  picks,
  correctAnswer,
  revealed,
  disabled,
  onChange,
  onCheck,
}: {
  prompt: string;
  html: string;
  baseCss: string;
  selector: string;
  targetCss: string;
  blanks: { property: string; choices: string[]; start: string }[];
  picks: Record<string, string>;
  correctAnswer?: Record<string, string> | null;
  revealed: boolean;
  disabled?: boolean;
  onChange: (next: Record<string, string>) => void;
  onCheck: () => void;
}) {
  const learnerCss = useMemo(
    () => `${baseCss}\n${blankCss(selector, picks)}`,
    [baseCss, selector, picks],
  );

  return (
    <>
      <p className="m-0 text-[17px] font-semibold text-[#1F1B24]">{prompt}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[#6B6572]">Target</div>
          <LivePreviewBox html={html} css={targetCss} className="h-[110px]" title="Target design" />
        </div>
        <div>
          <div className="mb-1 text-[11px] font-extrabold uppercase tracking-wide text-[#6B6572]">Yours</div>
          <LivePreviewBox html={html} css={learnerCss} className="h-[110px]" title="Your design" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {blanks.map((blank) => (
          <div key={blank.property} className="flex flex-col gap-1.5">
            <div className="font-mono text-[13px] font-bold text-[#4B4458]">{blank.property}</div>
            <div className="flex flex-wrap gap-2">
              {blank.choices.map((choice) => {
                const active = picks[blank.property] === choice;
                const isRight = revealed && correctAnswer?.[blank.property] === choice;
                const isWrong = revealed && active && !isRight;
                return (
                  <button
                    key={choice}
                    type="button"
                    disabled={disabled || revealed}
                    onClick={() => onChange({ ...picks, [blank.property]: choice })}
                    className={cn(
                      "min-h-[40px] rounded-xl border-2 px-3 py-1.5 font-mono text-[13px] font-bold transition disabled:cursor-default",
                      isRight
                        ? VARIANT_CLASS.correct
                        : isWrong
                          ? VARIANT_CLASS.incorrect
                          : active
                            ? VARIANT_CLASS.selected
                            : VARIANT_CLASS.idle,
                    )}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {!revealed ? (
        <button
          type="button"
          disabled={disabled || blanks.some((b) => !picks[b.property])}
          onClick={onCheck}
          className="min-h-[48px] rounded-2xl bg-primary px-5 text-[15px] font-extrabold text-white transition disabled:cursor-default disabled:opacity-40"
        >
          Check
        </button>
      ) : null}
    </>
  );
}
