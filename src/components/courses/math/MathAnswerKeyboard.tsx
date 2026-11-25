import { cn } from "@/lib/utils";

export type MathKeyboardKey =
  | "square"
  | "power"
  | "root"
  | "pi"
  | "minus"
  | "times"
  | "divide"
  | "fraction"
  | "le"
  | "ge"
  | "ne"
  | "degree"
  | "percent";

const KEY_INSERT: Record<MathKeyboardKey, { label: string; insert: string }> = {
  square: { label: "x²", insert: "²" },
  power: { label: "xⁿ", insert: "^" },
  root: { label: "√", insert: "√" },
  pi: { label: "π", insert: "π" },
  minus: { label: "−", insert: "−" },
  times: { label: "×", insert: "×" },
  divide: { label: "÷", insert: "÷" },
  fraction: { label: "a/b", insert: "/" },
  le: { label: "≤", insert: "≤" },
  ge: { label: "≥", insert: "≥" },
  ne: { label: "≠", insert: "≠" },
  degree: { label: "°", insert: "°" },
  percent: { label: "%", insert: "%" },
};

interface MathAnswerKeyboardProps {
  keys: MathKeyboardKey[];
  disabled?: boolean;
  onInsert: (text: string) => void;
}

/** Compact symbol row for formula_test questions that declare `keyboard`. */
export default function MathAnswerKeyboard({
  keys,
  disabled = false,
  onInsert,
}: MathAnswerKeyboardProps) {
  const known = keys.filter((k): k is MathKeyboardKey => k in KEY_INSERT);
  if (known.length === 0) return null;

  return (
    <div
      className="mb-2 flex flex-wrap gap-1.5"
      role="toolbar"
      aria-label="Maths symbols"
    >
      {known.map((key) => {
        const meta = KEY_INSERT[key];
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => onInsert(meta.insert)}
            className={cn(
              "min-h-11 min-w-11 rounded-xl border-2 border-primary/20 bg-primary/5 px-2.5 text-base font-bold text-primary transition",
              "hover:border-primary/40 hover:bg-primary/10 active:scale-[0.98]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            aria-label={`Insert ${meta.label}`}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
