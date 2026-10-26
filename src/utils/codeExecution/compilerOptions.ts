/**
 * C and C++ on Judge0 are linked without the thread library.
 * `std::thread` and `pthread` then fail with undefined references to
 * `pthread_create` and `pthread_join`. `-pthread` is the flag g++ expects.
 * C++ uses C++20. C uses C17 and links libm.
 */
export function compilerOptionsFor(language?: string): string | undefined {
  const lang = (language || "").toLowerCase().trim();
  if (lang === "c") return "-std=c17 -pthread -lm";
  if (lang === "cpp" || lang === "c++") return "-std=c++20 -pthread";
  return undefined;
}
