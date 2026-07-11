import axios from "axios";

export type LocationDefaults = {
  country: string;
  state: string;
  timezone: string;
};

/** Browser-only fallback when geo-IP is unavailable. */
export function inferLocationDefaults(): LocationDefaults {
  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone?.trim() || "UTC"
      : "UTC";
  return {
    country: "",
    state: "",
    timezone,
  };
}

/**
 * Resolve country / state / timezone via ipapi.co, falling back to browser defaults.
 * Uses plain axios (not the API instance) so the request is not sent to VITE_API_URL.
 */
export async function resolveLocationDefaults(): Promise<LocationDefaults> {
  const fallback = inferLocationDefaults();
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 1800);
    const response = await axios.get<{
      country_name?: string;
      region?: string;
      timezone?: string;
    }>("https://ipapi.co/json/", { signal: controller.signal });
    window.clearTimeout(timer);

    if (response.status < 200 || response.status >= 300) return fallback;

    const data = response.data ?? {};
    const timezone =
      String(data.timezone || fallback.timezone).trim() || fallback.timezone;
    const country =
      String(data.country_name || fallback.country).trim() || fallback.country;
    const state =
      String(data.region || fallback.state).trim() || fallback.state;
    return { country, state, timezone };
  } catch {
    return fallback;
  }
}
