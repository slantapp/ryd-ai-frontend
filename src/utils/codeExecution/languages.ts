export type CodeRunLanguage = {
  value: string;
  label: string;
};

/** Canonical runnable languages shown in the editor/runner dropdown. */
export const CODE_RUN_LANGUAGES: CodeRunLanguage[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "dart", label: "Dart" },
  { value: "java", label: "Java" },
  { value: "kotlin", label: "Kotlin" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "bash", label: "Bash" },
  { value: "lua", label: "Lua" },
  { value: "perl", label: "Perl" },
  { value: "swift", label: "Swift" },
];

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  python3: "python",
  python2: "python",
  node: "javascript",
  nodejs: "javascript",
  "node.js": "javascript",
  "c++": "cpp",
  cs: "csharp",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
};

const LANGUAGE_LABELS = Object.fromEntries(
  CODE_RUN_LANGUAGES.map((lang) => [lang.value, lang.label]),
) as Record<string, string>;

/** Map curriculum/course language strings to a canonical dropdown value. */
export function normalizeRunLanguage(language?: string): string {
  const raw = (language || "javascript").toLowerCase().trim();
  const canonical = LANGUAGE_ALIASES[raw] ?? raw;

  if (canonical === "web" || canonical === "html/css" || canonical === "html+css") {
    return "html";
  }
  if (canonical === "html" || canonical === "css") {
    return canonical;
  }

  return CODE_RUN_LANGUAGES.some((lang) => lang.value === canonical)
    ? canonical
    : "javascript";
}

export function getRunLanguageLabel(language?: string): string {
  const canonical = normalizeRunLanguage(language);
  return LANGUAGE_LABELS[canonical] ?? canonical;
}
