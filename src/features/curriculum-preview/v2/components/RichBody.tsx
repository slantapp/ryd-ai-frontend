import type { ReactNode } from "react";
import MathText from "@/components/courses/math/MathText";

/**
 * Display-beat body renderer for maths/coding lessons.
 * Supports GFM-ish tables, fenced code, HR (`---`), bold, inline code,
 * and `$…$` maths only (no auto-detection of operators in prose).
 */
export function RichBody({ text }: { text: string }) {
  const normalized = text.replace(/\r\n/g, "\n");
  const blocks = splitBlocks(normalized);

  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-700 sm:text-base">
      {blocks.map((block, bi) => {
        if (block.type === "hr") {
          return (
            <hr
              key={bi}
              className="border-0 border-t border-slate-200"
              aria-hidden
            />
          );
        }
        if (block.type === "code") {
          return (
            <pre
              key={bi}
              className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[0.85em] leading-relaxed text-slate-800 whitespace-pre"
            >
              <code>{block.value}</code>
            </pre>
          );
        }
        if (block.type === "table") {
          return <MarkdownTable key={bi} lines={block.lines} />;
        }
        if (block.type === "list") {
          return (
            <ul key={bi} className="space-y-2 pl-1">
              {block.lines.map((line, li) => (
                <li key={li} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span>
                    {renderInline(
                      line
                        .replace(/^\s*[-*]\s+/, "")
                        .replace(/^\s*\d+\.\s+/, ""),
                    )}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={bi} className="whitespace-pre-wrap">
            {block.lines.map((line, li) => (
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

type BodyBlock =
  | { type: "hr" }
  | { type: "code"; value: string }
  | { type: "table"; lines: string[] }
  | { type: "list"; lines: string[] }
  | { type: "paragraph"; lines: string[] };

function splitBlocks(text: string): BodyBlock[] {
  const lines = text.split("\n");
  const blocks: BodyBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (/^\s*```/.test(line)) {
      const fence = line.trim();
      const lang = fence.replace(/^```/, "").trim();
      i += 1;
      const body: string[] = [];
      while (i < lines.length && !/^\s*```/.test(lines[i] ?? "")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1; // closing fence
      blocks.push({
        type: "code",
        value: body.join("\n") + (lang ? "" : ""),
      });
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      const tableLines: string[] = [];
      while (i < lines.length && /\|/.test(lines[i] ?? "")) {
        tableLines.push(lines[i] ?? "");
        i += 1;
      }
      blocks.push({ type: "table", lines: tableLines });
      continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const listLines: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i] ?? "")) {
        listLines.push(lines[i] ?? "");
        i += 1;
      }
      blocks.push({ type: "list", lines: listLines });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() &&
      !/^\s*```/.test(lines[i] ?? "") &&
      !/^\s*---+\s*$/.test(lines[i] ?? "") &&
      !isTableStart(lines, i) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i] ?? "")
    ) {
      para.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ type: "paragraph", lines: para });
  }

  return blocks;
}

function isTableStart(lines: string[], index: number): boolean {
  const a = lines[index] ?? "";
  const b = lines[index + 1] ?? "";
  if (!/\|/.test(a) || !/\|/.test(b)) return false;
  return /^\s*\|?[\s:|-]+\|[\s:|-]*\|?\s*$/.test(b);
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((l) => !/^\s*\|?[\s:|-]+\|[\s:|-]*\|?\s*$/.test(l))
    .map(splitTableRow)
    .filter((r) => r.length > 0);
  if (rows.length === 0) return null;
  const [header, ...body] = rows;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {header.map((cell, i) => (
              <th
                key={i}
                className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900"
              >
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri} className="odd:bg-white even:bg-slate-50/60">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="border-b border-slate-100 px-3 py-1.5 text-slate-700"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Keep spaces around bold; do not trim match interiors away from neighbors.
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\$[^$\n]+\$)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(
        <MathText key={key++} mode="marked">
          {text.slice(last, match.index)}
        </MathText>,
      );
    }
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-bold text-slate-900">
          <MathText mode="marked">{token.slice(2, -2)}</MathText>
        </strong>,
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[0.9em] text-primary whitespace-pre-wrap"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("$")) {
      parts.push(
        <MathText key={key++} mode="marked">
          {token}
        </MathText>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    parts.push(
      <MathText key={key++} mode="marked">
        {text.slice(last)}
      </MathText>,
    );
  }
  return parts;
}
