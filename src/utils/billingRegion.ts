export function isNigeriaCountry(country?: string | null): boolean {
  if (!country?.trim()) return false;
  const c = country.trim().toLowerCase();
  return c.includes("nigeria") || c === "ng";
}
