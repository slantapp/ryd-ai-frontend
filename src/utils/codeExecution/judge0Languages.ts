export type Judge0Language = {
  id: number;
  name: string;
};

type LanguageRule = {
  canonical: string;
  matches: RegExp[];
};

/** Rules used to map canonical curriculum languages to Judge0 runtime names. */
const LANGUAGE_RULES: LanguageRule[] = [
  { canonical: "dart", matches: [/^Dart /i] },
  {
    canonical: "javascript",
    matches: [
      /JavaScript \(Node\.js 22/i,
      /JavaScript \(Node\.js 20/i,
      /JavaScript \(Node\.js 18/i,
      /JavaScript \(Node\.js/i,
    ],
  },
  { canonical: "typescript", matches: [/^TypeScript /i] },
  {
    canonical: "python",
    matches: [/Python \(3\.|Python 3/i, /^Python /i],
  },
  {
    canonical: "java",
    matches: [/Java \(JDK/i, /^Java \(OpenJDK/i],
  },
  { canonical: "kotlin", matches: [/^Kotlin /i] },
  { canonical: "swift", matches: [/^Swift /i] },
  { canonical: "csharp", matches: [/^C# /i] },
  { canonical: "c", matches: [/^C \(GCC/i, /^C \(Clang/i] },
  { canonical: "cpp", matches: [/^C\+\+ \(GCC/i, /^C\+\+ \(Clang/i] },
  { canonical: "go", matches: [/^Go /i] },
  { canonical: "rust", matches: [/^Rust /i] },
  { canonical: "php", matches: [/^PHP /i] },
  { canonical: "ruby", matches: [/^Ruby /i] },
  { canonical: "bash", matches: [/^Bash /i] },
  { canonical: "lua", matches: [/^Lua /i] },
  { canonical: "perl", matches: [/^Perl /i] },
  { canonical: "r", matches: [/^R /i] },
  { canonical: "scala", matches: [/^Scala /i] },
];

/** Bootstrap IDs when /languages cannot be fetched. */
const FALLBACK_LANGUAGE_IDS: Record<string, number> = {
  dart: 90,
  javascript: 102,
  typescript: 74,
  python: 71,
  java: 91,
  kotlin: 111,
  swift: 83,
  csharp: 51,
  c: 50,
  cpp: 54,
  go: 107,
  rust: 73,
  php: 98,
  ruby: 72,
  bash: 46,
  lua: 64,
  perl: 85,
  r: 80,
  scala: 81,
};

let languageIdMap: Record<string, number> | null = null;
let languageLoadPromise: Promise<Record<string, number>> | null = null;

function normalizeLanguageKey(language?: string): string {
  return (language || "javascript").toLowerCase().trim();
}

function buildLanguageIdMap(languages: Judge0Language[]): Record<string, number> {
  const map: Record<string, number> = {};

  for (const rule of LANGUAGE_RULES) {
    const candidates = languages.filter((lang) =>
      rule.matches.some((pattern) => pattern.test(lang.name)),
    );
    if (candidates.length === 0) continue;

    const best = candidates.reduce((latest, current) =>
      current.id > latest.id ? current : latest,
    );
    map[rule.canonical] = best.id;
  }

  return { ...FALLBACK_LANGUAGE_IDS, ...map };
}

export async function loadJudge0LanguageIds(
  apiUrl: string,
  headers: HeadersInit,
): Promise<Record<string, number>> {
  if (languageIdMap) return languageIdMap;
  if (languageLoadPromise) return languageLoadPromise;

  languageLoadPromise = fetch(`${apiUrl}/languages`, { headers })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Could not load Judge0 languages (${response.status}).`);
      }
      const languages = (await response.json()) as Judge0Language[];
      languageIdMap = buildLanguageIdMap(languages);
      return languageIdMap;
    })
    .catch(() => {
      languageIdMap = { ...FALLBACK_LANGUAGE_IDS };
      return languageIdMap;
    })
    .finally(() => {
      languageLoadPromise = null;
    });

  return languageLoadPromise;
}

export function getCachedLanguageId(language?: string): number | null {
  const key = normalizeLanguageKey(language);
  const map = languageIdMap ?? FALLBACK_LANGUAGE_IDS;
  return map[key] ?? null;
}

export async function resolveJudge0LanguageId(
  language: string | undefined,
  apiUrl: string,
  headers: HeadersInit,
): Promise<number | null> {
  const map = await loadJudge0LanguageIds(apiUrl, headers);
  const key = normalizeLanguageKey(language);
  return map[key] ?? null;
}

export function canExecuteCode(language?: string): boolean {
  return getCachedLanguageId(language) !== null;
}

/** Reset cached language map (useful in tests). */
export function resetJudge0LanguageCache(): void {
  languageIdMap = null;
  languageLoadPromise = null;
}
