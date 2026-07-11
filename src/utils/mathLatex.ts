/** Escape plain text for use inside KaTeX \\text{...}. */
function escapeLatexText(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%#_{}]/g, (c) => `\\${c}`);
}

/**
 * Convert "x" to \\times only when it clearly means multiplication
 * (between numbers or after a closing bracket/brace), not for variables like "x tens".
 */
function replaceNumericMultiplicationX(s: string): string {
  return s
    .replace(/(\d)\s+x\s+(\d)/gi, "$1 \\times $2")
    .replace(/(\})\s+x\s+(\d)/gi, "$1 \\times $2")
    .replace(/(\))\s+x\s+(\d)/gi, "$1 \\times $2")
    .replace(/(\d)\s+x\s+\(/gi, "$1 \\times (");
}

type ProtectedLatex = { body: string; tokens: string[] };

/** Hide existing LaTeX commands so word-wrapping does not corrupt them. */
function protectLatexCommands(s: string): ProtectedLatex {
  const tokens: string[] = [];
  const body = s.replace(
    /\\(?:left\([^)]*\\right\)(?:\^\{[^}]*\})?|sqrt\{[^}]*\}|times|text\{[^}]*\})|\^\{[^}]*\}/g,
    (match) => {
      const token = `__LTX${tokens.length}__`;
      tokens.push(match);
      return token;
    },
  );
  return { body, tokens };
}

function restoreLatexCommands(body: string, tokens: string[]): string {
  let out = body;
  tokens.forEach((token, index) => {
    out = out.replace(`__LTX${index}__`, token);
  });
  return out;
}

/** Apply a regex replacement only outside \\text{...} blocks and LTX placeholders. */
function replaceOutsideTextBlocks(
  s: string,
  pattern: RegExp,
  onMatch: (fullMatch: string, ...captured: string[]) => string,
): string {
  const preserved = /\\text\{[^}]*\}|__LTX\d+__/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const apply = (chunk: string) =>
    chunk.replace(pattern, (fullMatch, ...args) => {
      const captured = args.slice(0, -2) as string[];
      return onMatch(fullMatch, ...captured);
    });

  while ((match = preserved.exec(s)) !== null) {
    if (match.index > lastIndex) {
      result += apply(s.slice(lastIndex, match.index));
    }
    result += match[0];
    lastIndex = match.index + match[0].length;
  }

  result += apply(s.slice(lastIndex));
  return result;
}

/**
 * Wrap alphabetic words and phrases in \\text{...} so KaTeX renders them upright
 * with preserved letter spacing (math mode otherwise joins letters like t·e·n·s).
 */
function wrapAlphabeticText(s: string): string {
  // Number + alphabetic phrase: "3 tens", "5 hundreds"
  let out = s.replace(
    /(\d+(?:\.\d+)?)\s+([A-Za-z]+(?:\s+[A-Za-z]+)*)\b/g,
    (_, num: string, phrase: string) =>
      `${num}\\ \\text{${escapeLatexText(phrase)}}`,
  );

  // Multi-word letter phrases: "x tens", "place value", "y ones"
  out = replaceOutsideTextBlocks(out, /([A-Za-z]+(?:\s+[A-Za-z]+)+)/g, (phrase) =>
    `\\text{${escapeLatexText(phrase)}}`,
  );

  // Remaining standalone words (2+ letters): "tens", "hundreds", "xy"
  out = replaceOutsideTextBlocks(out, /\b([A-Za-z]{2,})\b/g, (_full, word) =>
    `\\text{${escapeLatexText(word)}}`,
  );

  return out;
}

/** Convert spaces outside \\text{...} and placeholders to explicit LaTeX spaces. */
function preserveSpaces(s: string): string {
  const preserved = /\\text\{[^}]*\}|__LTX\d+__/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = preserved.exec(s)) !== null) {
    if (match.index > lastIndex) {
      result += s.slice(lastIndex, match.index).replace(/ /g, "\\ ");
    }
    result += match[0];
    lastIndex = match.index + match[0].length;
  }

  result += s.slice(lastIndex).replace(/ /g, "\\ ");
  return result;
}

function containsMathLatex(s: string): boolean {
  return (
    /\\sqrt|\\times|\\text|\\left|\\right/.test(s) ||
    /\^/.test(s) ||
    /=\s*\\?\s*\d/.test(s) ||
    /\\ /.test(s) ||
    /[+\-*/=]/.test(s)
  );
}

/**
 * Convert curriculum plain-text math (powers, sqrt, multiplication) into LaTeX
 * suitable for KaTeX display in the math learning environment.
 */
export function curriculumMathToLatex(raw: string): string {
  const input = raw.trim();
  if (!input) return "";

  const dollarTokens: string[] = [];
  let s = input.replace(/\$(\d+(?:\.\d+)?)/g, (_, amount: string) => {
    const token = `__DOLLAR_${dollarTokens.length}__`;
    dollarTokens.push(`\\text{\\$${amount}}`);
    return token;
  });

  s = s.replace(/sqrt\(([^)]+)\)/gi, (_, inner: string) => {
    return `\\sqrt{${inner.trim()}}`;
  });

  s = replaceNumericMultiplicationX(s);

  // Word "times" / "multiplied by" between values → ×
  s = s.replace(
    /(\d+(?:\.\d+)?|\})\s+(?:times|multiplied by)\s+(\d+(?:\.\d+)?|\\)/gi,
    "$1 \\times $2",
  );

  s = s.replace(/\(([^()]+)\)\^(\d+)/g, (_, base: string, exp: string) => {
    return `\\left(${base.trim()}\\right)^{${exp}}`;
  });

  // Powers: 5^2, x^10, 5^{2}
  s = s.replace(/([A-Za-z0-9.]+)\^\{([^}]+)\}/g, (_, base: string, exp: string) => {
    return `${base}^{${exp.trim()}}`;
  });
  s = s.replace(/([A-Za-z0-9.]+)\^(\d+)/g, (_, base: string, exp: string) => {
    return `${base}^{${exp}}`;
  });

  // After power conversion, catch "5^{2} times 5^{3}"
  s = s.replace(
    /(\^\{[^}]+\})\s+(?:times|multiplied by)\s+/gi,
    "$1 \\times ",
  );

  s = replaceNumericMultiplicationX(s);
  s = s.replace(/(\d+)\s*:\s*(\d+)/g, "$1 : $2");

  dollarTokens.forEach((replacement, index) => {
    s = s.replace(`__DOLLAR_${index}__`, replacement);
  });

  const { body, tokens } = protectLatexCommands(s);
  let rendered = wrapAlphabeticText(body);
  rendered = preserveSpaces(rendered);
  rendered = restoreLatexCommands(rendered, tokens);

  if (containsMathLatex(rendered)) {
    return rendered;
  }

  return `\\text{${escapeLatexText(input)}}`;
}

/** True when the string likely contains math notation worth rendering with KaTeX. */
export function looksLikeMath(text: string): boolean {
  return (
    /sqrt\(|\^|\d\s*x\s*\d|\$\d|=\s*\d|\\frac|\d+\/\d+/.test(text) ||
    /\d\s+(?:times|multiplied by)\s+\d/i.test(text) ||
    /\\sqrt|\\times|\\text|\^/.test(text)
  );
}

/**
 * Split prose + math so long explanations wrap normally while math fragments
 * still render with KaTeX (avoids one giant non-wrapping katex line).
 */
export function splitMixedMathText(
  text: string,
): Array<{ type: "text" | "math"; value: string }> {
  const input = text.trim();
  if (!input) return [];

  // Short pure-math strings: keep as a single math segment.
  const wordCount = input.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 8 && looksLikeMath(input) && !/[.!?].+\s/.test(input)) {
    return [{ type: "math", value: input }];
  }

  if (!looksLikeMath(input)) {
    return [{ type: "text", value: input }];
  }

  const mathRun =
    /\$\d+(?:\.\d+)?|sqrt\([^)]+\)|\d+(?:\.\d+)?(?:\^\d+)?(?:\s*(?:times|multiplied by|[+\-×x*/=:])\s*\d+(?:\.\d+)?(?:\^\d+)?)+|\d+(?:\.\d+)?\^\d+/gi;

  const parts: Array<{ type: "text" | "math"; value: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRun.exec(input)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: input.slice(lastIndex, match.index),
      });
    }
    parts.push({ type: "math", value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < input.length) {
    parts.push({ type: "text", value: input.slice(lastIndex) });
  }

  // If we failed to find useful math runs, fall back to one math block.
  if (parts.length === 0 || parts.every((p) => p.type === "text")) {
    return [{ type: "math", value: input }];
  }

  return parts.filter((p) => p.value.length > 0);
}
