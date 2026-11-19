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

/** Normalize learner math answers for comparison (spacing, currency, units, words). */
export function normalizeFormulaAnswer(raw: string): string {
  let s = (raw ?? "").trim().toLowerCase();
  if (!s) return "";

  for (const [glyph, ascii] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.split(glyph).join(ascii);
  }

  s = s.replace(/\$/g, "");
  s = s.replace(/(\d),(\d)/g, "$1$2");
  s = s.replace(/−/g, "-");
  s = s.replace(/×/g, "*");
  s = s.replace(/÷/g, "/");
  s = s.replace(/\s+/g, " ");

  // Number words → digits (whole-token)
  s = s.replace(
    /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/g,
    (word) => NUMBER_WORDS[word] ?? word,
  );

  s = s.replace(/\s*([+\-*/=:,])\s*/g, "$1");
  s = s.replace(/\s*(km|cm|mm|m|kg|g|ml|l)\b/gi, " $1");
  return s.trim();
}

function answersEqual(a: string, b: string): boolean {
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
