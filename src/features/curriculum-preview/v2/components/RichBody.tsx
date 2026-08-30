import type { ReactNode } from "react";
import MathText from "@/components/courses/math/MathText";

/** Lightweight markdown-ish renderer for display beat bodies (bold, code, newlines). */
export function RichBody({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l));

        if (isList) {
          return (
            <ul key={bi} className="space-y-2 pl-1">
              {lines.map((line, li) => (
                <li key={li} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span>{renderInline(line.replace(/^\s*[-*]\s+/, "").replace(/^\s*\d+\.\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={bi}>
            {lines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <MathText key={key++}>{text.slice(last, match.index)}</MathText>,
      );
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-bold text-slate-900">
          <MathText>{token.slice(2, -2)}</MathText>
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={key++}
          className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[0.9em] text-primary"
        >
          <MathText>{token.slice(1, -1)}</MathText>
        </code>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    parts.push(<MathText key={key++}>{text.slice(last)}</MathText>);
  }
  return parts;
}
