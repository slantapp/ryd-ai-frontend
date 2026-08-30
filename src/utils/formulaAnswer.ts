/** Normalize learner math answers for comparison (spacing, currency, units). */
export function normalizeFormulaAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\$/g, "")
    .replace(/(\d),(\d)/g, "$1$2")
    .replace(/\s+/g, " ")
    .replace(/\s*([+\-×x*/=:,])\s*/g, "$1")
    .replace(/\s*(km|cm|m|kg|g|ml|l)\b/gi, " $1")
    .trim();
}

/**
 * Compare student answer to expected — exact normalized match or numeric
 * equality with the same unit. Does not accept partial digit fragments.
 */
export function compareFormulaAnswer(student: string, expected: string): boolean {
  const a = normalizeFormulaAnswer(student);
  const b = normalizeFormulaAnswer(expected);
  if (!a || !b) return false;
  if (a === b) return true;

  const numA = parseFloat(a.replace(/[^\d.-]/g, ""));
  const numB = parseFloat(b.replace(/[^\d.-]/g, ""));
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA === numB) {
    const unitA = a.replace(/[\d.\s-]/g, "");
    const unitB = b.replace(/[\d.\s-]/g, "");
    return unitA === unitB;
  }

  return false;
}
