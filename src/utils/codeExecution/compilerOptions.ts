/** Extra flags so Judge0's g++ matches a normal classroom build. */
const PTHREAD_LANGUAGES = new Set(["c", "cpp", "c++"]);

/**
 * C and C++ on Judge0 are linked without the thread library.
 * `std::thread` and `pthread` then fail with undefined references to
 * `pthread_create` and `pthread_join`. `-pthread` is the flag g++ expects.
 */
export function compilerOptionsFor(language?: string): string | undefined {
  const lang = (language || "").toLowerCase().trim();
  if (PTHREAD_LANGUAGES.has(lang)) return "-pthread";
  return undefined;
}
