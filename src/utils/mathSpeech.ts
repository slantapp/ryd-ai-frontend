/**
 * Convert on-screen maths text into something TTS can read clearly.
 * Applied before avatar speech for mathematics courses.
 */
const EMOJI_NAMES: Record<string, string> = {
  "🍎": "apple",
  "⭐": "star",
  "🔴": "red circle",
  "🟢": "green circle",
  "🔵": "blue circle",
  "🟡": "yellow circle",
  "🟩": "green square",
  "🟦": "blue square",
  "🟧": "orange square",
  "🟪": "purple square",
  "🐸": "frog",
};

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

const FRACTION_WORDS: Record<string, string> = {
  "1/2": "one half",
  "1/3": "one third",
  "2/3": "two thirds",
  "1/4": "one quarter",
  "3/4": "three quarters",
  "1/5": "one fifth",
  "2/5": "two fifths",
  "3/5": "three fifths",
  "4/5": "four fifths",
  "1/6": "one sixth",
  "5/6": "five sixths",
  "1/8": "one eighth",
  "3/8": "three eighths",
  "5/8": "five eighths",
  "7/8": "seven eighths",
};

function stripEmojiRuns(text: string): string {
  return text.replace(
    /([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])\1*/gu,
    (run, first: string) => {
      const name = EMOJI_NAMES[first];
      if (!name) return " ";
      const count = [...run].length;
      if (count === 1) return ` ${name} `;
      return ` ${count} ${name}s `;
    },
  );
}

function fractionToWords(frac: string): string {
  return FRACTION_WORDS[frac] ?? frac.replace("/", " over ");
}

/** Speakable form of curriculum / on-screen maths text. */
export function toSpeech(raw: string): string {
  let s = raw ?? "";
  if (!s.trim()) return "";

  s = stripEmojiRuns(s);

  s = s.replace(/_{2,}|□/g, " blank ");
  s = s.replace(/[·•|]/g, ", ");

  // Ranges with en/em dash: C1–C7 → C1 to C7
  s = s.replace(
    /([A-Za-z0-9.]+)\s*[–—]\s*([A-Za-z0-9.]+)/g,
    "$1 to $2",
  );

  for (const [glyph, ascii] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.split(glyph).join(` ${ascii} `);
  }

  // Mixed numbers: 2 1/4 → two and one quarter (keep digit form for word map)
  s = s.replace(
    /(\d+)\s+(\d+\/\d+)/g,
    (_, whole: string, frac: string) =>
      `${whole} and ${fractionToWords(frac)}`,
  );

  s = s.replace(/(\d+)\/(\d+)/g, (full, a: string, b: string) => {
    const key = `${a}/${b}`;
    return FRACTION_WORDS[key] ?? `${a} over ${b}`;
  });

  // Superscripts / subscripts digits
  s = s.replace(/([A-Za-z0-9])²/g, "$1 squared");
  s = s.replace(/([A-Za-z0-9])³/g, "$1 cubed");
  s = s.replace(/([A-Za-z0-9])([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, base: string, sup: string) => {
    const map: Record<string, string> = {
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
    const digits = [...sup].map((c) => map[c] ?? c).join("");
    return `${base} to the ${digits}`;
  });
  s = s.replace(/\^(\d+)/g, " to the $1");
  s = s.replace(/\^\{([^}]+)\}/g, " to the $1");

  s = s.replace(/√\s*\(?\s*([^)\s]+)\s*\)?/g, " the square root of $1 ");
  s = s.replace(/√/g, " square root ");
  s = s.replace(/π/gi, " pi ");

  // Leading negative numbers
  s = s.replace(/(^|[^0-9])[−-](\d+(?:\.\d+)?)/g, "$1 negative $2");

  s = s.replace(/≠/g, " is not equal to ");
  s = s.replace(/≥/g, " is greater than or equal to ");
  s = s.replace(/≤/g, " is less than or equal to ");
  s = s.replace(/>/g, " is greater than ");
  s = s.replace(/</g, " is less than ");
  s = s.replace(/×|\*/g, " times ");
  s = s.replace(/÷/g, " divided by ");
  s = s.replace(/−/g, " minus ");
  s = s.replace(/(?<=\d)\s*-\s*(?=\d)/g, " minus ");
  s = s.replace(/\+/g, " plus ");
  s = s.replace(/=/g, " equals ");
  s = s.replace(/%/g, " percent ");
  s = s.replace(/°/g, " degrees ");

  // Ratios / times like 3:4 between numbers (not clock times with known patterns already ok)
  s = s.replace(/(\d+)\s*:\s*(\d+)(?!\d)/g, "$1 to $2");

  // Coordinates (2, -3) after negative rewrite may be "2, negative 3"
  s = s.replace(/\(\s*([^)]+)\s*\)/g, " $1 ");

  s = s
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ",")
    .trim();

  return s;
}
