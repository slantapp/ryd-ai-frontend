import { normalizeRunLanguage } from "./languages";

/** Map curriculum language strings to Monaco editor language ids. */
export function toMonacoLanguage(language?: string): string {
  const lang = normalizeRunLanguage(language);
  const map: Record<string, string> = {
    cpp: "cpp",
    csharp: "csharp",
    bash: "shell",
    shell: "shell",
    html: "html",
    sqlite: "sql",
  };
  return map[lang] ?? lang;
}
