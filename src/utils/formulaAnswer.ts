/** Unicode vulgar fractions → ASCII a/b. */
const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "¼": "1/4",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  thirteen: "13",
  fourteen: "14",
  fifteen: "15",
  sixteen: "16",
  seventeen: "17",
  eighteen: "18",
  nineteen: "19",
  twenty: "20",
  thirty: "30",
  forty: "40",
  fifty: "50",
  sixty: "60",
  seventy: "70",
  eighty: "80",
  ninety: "90",
  hundred: "100",
};

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

/** Normalize learner math answers for comparison (spacing, currency, units, words). */
export function normalizeFormulaAnswer(raw: string): string {
  let s = (raw ?? "").trim().toLowerCase();
  if (!s) return "";

  for (const [glyph, ascii] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.split(glyph).join(ascii);
  }

  // Powers: x² / x**2 / 10³ → x^2 / 10^3
  s = s.replace(/²/g, "^2");
  s = s.replace(/³/g, "^3");
  s = s.replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_full, digs: string) => {
    const ascii = [...digs].map((c) => SUPERSCRIPT_DIGITS[c] ?? c).join("");
    return `^${ascii}`;
  });
  s = s.replace(/\*\*/g, "^");

  // Roots / inequalities (plain spellings)
  s = s.replace(/√\s*/g, "sqrt");
  s = s.replace(/\bpi\b/g, "π");
  s = s.replace(/≤/g, "<=");
  s = s.replace(/≥/g, ">=");
  s = s.replace(/≠/g, "!=");

  s = s.replace(/\$/g, "");
  // Thousands separators only (1,000 / 1,000,000) — keep coordinate commas (2,3).
  s = s.replace(/\b(\d{1,3}(?:,\d{3})+)\b/g, (m) => m.replace(/,/g, ""));
  s = s.replace(/−/g, "-");
  s = s.replace(/×/g, "*");
  s = s.replace(/÷/g, "/");

  // Mixed numbers → improper fractions before collapsing digit spaces
  s = s.replace(/(-?\d+)\s+(\d+)\/(\d+)/g, (_full, whole: string, n: string, d: string) => {
    const w = Number(whole);
    const num = Number(n);
    const den = Number(d);
    if (!den) return `${whole} ${n}/${d}`;
    const sign = w < 0 ? -1 : 1;
    return `${sign * (Math.abs(w) * den + num)}/${den}`;
  });

  // Thin / regular spaces between digit groups: 1 000 000 → 1000000
  s = s.replace(/(\d)\s+(?=\d)/g, "$1");
  s = s.replace(/\s+/g, " ");

  // Number words → digits (whole-token)
  s = s.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/g,
    (word) => NUMBER_WORDS[word] ?? word,
  );

  s = s.replace(/\s*([+\-*/=:,^])\s*/g, "$1");
  // Point / tuple spaces: (2, 3) → (2,3)
  s = s.replace(/\(\s*/g, "(");
  s = s.replace(/\s*\)/g, ")");
  s = s.replace(/,\s*/g, ",");
  s = s.replace(/\s*(km|cm|mm|m|kg|g|ml|l)\b/gi, " $1");
  return s.trim();
}

function parseFraction(s: string): { n: number; d: number } | null {
  const simple = /^(-?\d+)\/(-?\d+)$/.exec(s);
  if (simple) {
    const n = Number(simple[1]);
    const d = Number(simple[2]);
    if (!d) return null;
    return { n, d };
  }
  return null;
}

function fractionValue(s: string): number | null {
  const frac = parseFraction(s);
  if (frac) return frac.n / frac.d;
  const pct = /^(-?\d+(?:\.\d+)?)%$/.exec(s);
  if (pct) return Number(pct[1]) / 100;
  if (/^[-+]?\d+(?:\.\d+)?$/.test(s)) {
    const num = Number(s);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

/** Commute simple sum terms: "3+2x" ↔ "2x+3". */
function normalizeExpressionTerms(s: string): string {
  if (/[()^*/]/.test(s)) return s;
  const terms: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if ((c === "+" || c === "-") && cur) {
      terms.push(cur);
      cur = c === "-" ? "-" : "";
    } else {
      cur += c;
    }
  }
  if (cur) terms.push(cur);
  if (terms.length < 2) return s;
  return [...terms]
    .map((t) => t.replace(/^\+/, ""))
    .sort((a, b) => a.localeCompare(b))
    .join("+")
    .replace(/\+-/g, "-");
}

/** Strip "x=" / "y=" style equation left side when comparing to a bare value. */
function equationRhs(s: string): string | null {
  const m = /^[a-z][a-z0-9]*\s*=\s*(.+)$/i.exec(s);
  return m ? m[1]!.trim() : null;
}

function answersEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  // Equation vs value: "x=7" ↔ "7"
  const aRhs = equationRhs(a);
  const bRhs = equationRhs(b);
  if (aRhs && aRhs === b) return true;
  if (bRhs && bRhs === a) return true;
  if (aRhs && bRhs && aRhs === bRhs) return true;

  // Expression commute
  if (normalizeExpressionTerms(a) === normalizeExpressionTerms(b)) return true;

  // Numeric / fraction / percent equivalence
  const va = fractionValue(a);
  const vb = fractionValue(b);
  if (va != null && vb != null && Math.abs(va - vb) < 1e-9) return true;

  // Equivalent fractions by cross-multiply (exact)
  const fa = parseFraction(a);
  const fb = parseFraction(b);
  if (fa && fb && fa.n * fb.d === fb.n * fa.d) return true;

  const numA = parseFloat(a.replace(/[^\d.-]/g, ""));
  const numB = parseFloat(b.replace(/[^\d.-]/g, ""));
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA === numB) {
    const unitA = a.replace(/[\d.\s-]/g, "");
    const unitB = b.replace(/[\d.\s-]/g, "");
    return unitA === unitB;
  }

  return false;
}

/**
 * Compare student answer to expected — exact normalized match or numeric
 * equality with the same unit. Also matches any entry in `accept`.
 */
export function compareFormulaAnswer(
  student: string,
  expected: string,
  accept?: string[] | null,
): boolean {
  const a = normalizeFormulaAnswer(student);
  if (!a) return false;

  const candidates = [
    expected,
    ...(Array.isArray(accept) ? accept : []),
  ].filter((c): c is string => typeof c === "string" && c.trim().length > 0);

  return candidates.some((candidate) =>
    answersEqual(a, normalizeFormulaAnswer(candidate)),
  );
}
