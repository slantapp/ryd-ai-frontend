/** Lone variable or tuple like x, y, x1, (x, y) — not a prose label or expression. */
function isAssignmentTarget(left: string): boolean {
  const s = left.trim();
  if (!s) return false;
  // Single math variable: x, y, n, x1, y2 (not "distance" / "speed")
  if (/^[A-Za-z][_A-Za-z0-9]?$/.test(s) || /^[A-Za-z]\d$/.test(s)) return true;
  return /^\(\s*[A-Za-z][_A-Za-z0-9]?(?:\s*,\s*[A-Za-z][_A-Za-z0-9]?)*\s*\)$/.test(
    s,
  );
}

/** Right-hand side that looks like a worked final answer, not more algebra. */
function looksLikeFinalAnswer(right: string): boolean {
  const s = right.trim();
  if (!s || /[?]/.test(s)) return false;
  if (/[=;]/.test(s)) return false;
  // Numbers, money, ratios, percents, simple units
  if (/^\$?-?\d+(?:\.\d+)?(?:\s*(?:km|cm|mm|m|kg|g|ml|l|%))?$/i.test(s)) {
    return true;
  }
  if (/^\d+\s*:\s*\d+$/.test(s)) return true;
  // Coordinate / tuple answers: (3, 7)
  if (/^\(\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)*\s*\)$/.test(s)) {
    return true;
  }
  // Short plain token answers (e.g. "yes", "true") — keep conservative
  return false;
}

/**
 * Strip a worked-example result so practice shows the problem, not the answer.
 *
 * Examples:
 * - "246 times 3 equals 738" → "246 times 3"
 * - "5 + 3 = 8" → "5 + 3"
 * - "(6 - 2)^2 + (-3)^2 x 2 = 34" → "(6 - 2)^2 + (-3)^2 x 2"
 * - "x = 0 + 3; y = 0 + 7; (x, y) = (3, 7)" → "x = 0 + 3; y = 0 + 7; (x, y) = ?"
 *
 * Preserves formulas where "=" is part of the problem itself:
 * - "x = 0 + 3; y = 0 + 7; (x, y) = ?" (already a prompt)
 * - "x = 5" (assignment statement, not "expression = answer")
 */
export function formulaProblemOnly(formula: string | undefined | null): string {
  const text = formula?.trim() ?? "";
  if (!text) return "";

  // Already a prompt with a blank — keep the full board text.
  if (/\?/.test(text)) return text;

  // Multi-statement boards: never cut at the first "=". Only hide a trailing
  // concrete result after the last separator (replace with "?").
  if (/;/.test(text)) {
    const trailing = /^(.*?)(?:\s*(?:=+|equals|is close to|which is|→|->)\s*)([^=;→]+)$/i.exec(
      text,
    );
    if (trailing) {
      const left = trailing[1].trim();
      const right = trailing[2].trim();
      if (left && looksLikeFinalAnswer(right)) {
        return `${left} = ?`;
      }
    }
    return text;
  }

  // Word / arrow separators are almost always "problem → answer".
  const wordSplit = text.split(
    /\s+(?:equals|is close to|which is)\s+|\s*(?:→|->)\s*/i,
  );
  if (wordSplit.length >= 2) {
    const left = (wordSplit[0] ?? "").trim();
    const right = wordSplit.slice(1).join(" ").trim();
    if (left && looksLikeFinalAnswer(right)) return left;
    if (left && wordSplit.length === 2) return left;
  }

  // "=" chains: strip only when the left of the first "=" is an expression,
  // not an assignment target like "x" or "(x, y)".
  const eqParts = text.split(/\s*=+\s*/);
  if (eqParts.length < 2) return text;

  const left = (eqParts[0] ?? "").trim();
  const last = (eqParts[eqParts.length - 1] ?? "").trim();
  if (!left) return text;

  if (isAssignmentTarget(left)) {
    // "x = 5" or "(x, y) = (3, 7)" — keep intact so the board still reads as math.
    // Multi-equals identities with a trailing value still drop the result.
    if (eqParts.length >= 3 && looksLikeFinalAnswer(last)) {
      return eqParts.slice(0, -1).join(" = ").trim();
    }
    return text;
  }

  const leftLooksLikeExpression = /[\d+\-*/^×()]/.test(left);

  // Worked expression chains: "(…)^2 + … = 16 + 18 = 34" → before first "="
  if (leftLooksLikeExpression) {
    return left;
  }

  // "distance = speed × time = 60" → drop the trailing worked value
  if (eqParts.length >= 3 && looksLikeFinalAnswer(last)) {
    return eqParts.slice(0, -1).join(" = ").trim();
  }

  // "5 + 3 = 8" style
  if (looksLikeFinalAnswer(last)) return left;

  return text;
}

/**
 * Normalize formula board text for display (does not strip answers).
 * Turns semicolon-separated statements into separate visual lines.
 */
export function formatFormulaBoardText(
  formula: string | undefined | null,
): string {
  const text = formula?.trim() ?? "";
  if (!text) return "";
  // Keep spacing tidy around statement separators; KaTeX line-breaks are
  // applied later in curriculumMathToLatex.
  return text.replace(/\s*;\s*/g, "; ");
}
