import { useMemo } from "react";
import { TOKEN_COLORS, tokenizeCode } from "../codeTokens";

/** Dark code panel with the three window dots, as on the flashcard guide. */
export function CodeBlock({ code, language, className }: { code: string; language?: string | null; className?: string }) {
  const tokens = useMemo(() => tokenizeCode(code, language), [code, language]);
  return (
    <div className={`rounded-2xl bg-[#1E1B2E] px-5 py-4 sm:px-6 sm:py-5 ${className ?? ""}`}>
      <div className="mb-3 flex gap-1.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-[#FF5F57]" />
        <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="size-2.5 rounded-full bg-[#28C840]" />
      </div>
      <pre className="overflow-x-auto font-mono text-[15px] leading-relaxed sm:text-[17px]">
        <code>
          {tokens.map((t, i) => (
            <span key={i} style={{ color: TOKEN_COLORS[t.kind] }}>
              {t.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Inline code chip in the same palette (fill in the blank, match pairs). */
export function InlineCode({ code, language }: { code: string; language?: string | null }) {
  const tokens = useMemo(() => tokenizeCode(code, language), [code, language]);
  return (
    <code className="whitespace-pre-wrap break-words font-mono">
      {tokens.map((t, i) => (
        <span key={i} style={{ color: TOKEN_COLORS[t.kind] }}>
          {t.text}
        </span>
      ))}
    </code>
  );
}
