/**
 * Strip a worked-example result so practice shows the problem, not the answer.
 * e.g. "246 times 3 equals 738" → "246 times 3"
 */
export function formulaProblemOnly(formula: string | undefined | null): string {
  const text = formula?.trim() ?? "";
  if (!text) return "";

  const split = text.split(
    /\s*(?:=+|equals|is close to|which is|→|->)\s*/i,
  );
  const problem = (split[0] ?? "").trim();
  return problem || text;
}
