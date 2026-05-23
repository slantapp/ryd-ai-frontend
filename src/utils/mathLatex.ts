/** Escape plain text for use inside KaTeX \\text{...}. */
function escapeLatexText(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%#_{}]/g, (c) => `\\${c}`);
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

  s = s.replace(/\(([^()]+)\)\^(\d+)/g, (_, base: string, exp: string) => {
    return `\\left(${base.trim()}\\right)^{${exp}}`;
  });

  s = s.replace(/([A-Za-z0-9.]+)\^(\d+)/g, (_, base: string, exp: string) => {
    return `${base}^{${exp}}`;
  });

  s = s.replace(/\s+x\s+/gi, " \\times ");
  s = s.replace(/(\d+)\s*:\s*(\d+)/g, "$1 : $2");

  dollarTokens.forEach((replacement, index) => {
    s = s.replace(`__DOLLAR_${index}__`, replacement);
  });

  if (/\\sqrt|\\times|\^|\$/.test(s) || /=\s*\d/.test(s)) {
    return s;
  }

  return `\\text{${escapeLatexText(s)}}`;
}

/** True when the string likely contains math notation worth rendering with KaTeX. */
export function looksLikeMath(text: string): boolean {
  return (
    /sqrt\(|\^|\d\s*x\s*\d|\$\d|=\s*\d|\\frac|\d+\/\d+/.test(text) ||
    /\\sqrt|\\times|\^/.test(text)
  );
}
