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

/**
 * Preserve spaces before place-value words (tens, ones, etc.) using \\text{...}.
 * e.g. "3 tens" → "3\\ \\text{tens}", "x tens" → "x\\ \\text{tens}".
 */
function wrapPlaceValueWords(s: string): string {
  return s
    .replace(/(\d+)\s+([A-Za-z]{2,})\b/g, (_, num: string, word: string) => {
      return `${num}\\ \\text{${escapeLatexText(word)}}`;
    })
    .replace(/([A-Za-z])\s+([A-Za-z]{2,})\b/g, (_, letter: string, word: string) => {
      return `${letter}\\ \\text{${escapeLatexText(word)}}`;
    });
}

function containsMathLatex(s: string): boolean {
  return (
    /\\sqrt|\\times|\\text|\\left|\\right/.test(s) ||
    /\^/.test(s) ||
    /=\s*\d/.test(s)
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

  s = s.replace(/\(([^()]+)\)\^(\d+)/g, (_, base: string, exp: string) => {
    return `\\left(${base.trim()}\\right)^{${exp}}`;
  });

  s = s.replace(/([A-Za-z0-9.]+)\^(\d+)/g, (_, base: string, exp: string) => {
    return `${base}^{${exp}}`;
  });

  s = replaceNumericMultiplicationX(s);
  s = wrapPlaceValueWords(s);
  s = s.replace(/(\d+)\s*:\s*(\d+)/g, "$1 : $2");

  dollarTokens.forEach((replacement, index) => {
    s = s.replace(`__DOLLAR_${index}__`, replacement);
  });

  if (containsMathLatex(s)) {
    return s;
  }

  return `\\text{${escapeLatexText(s)}}`;
}

/** True when the string likely contains math notation worth rendering with KaTeX. */
export function looksLikeMath(text: string): boolean {
  return (
    /sqrt\(|\^|\d\s*x\s*\d|\$\d|=\s*\d|\\frac|\d+\/\d+/.test(text) ||
    /\\sqrt|\\times|\\text|\^/.test(text)
  );
}
