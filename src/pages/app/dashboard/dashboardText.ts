import type { DashboardRecommendation, DashboardTestSuggestion } from "@/api/dashboard";

/** 0 → "0 min", 45 → "45 min", 200 → "3 h 20 min". */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Compact form for stat tiles: 45 → "45 min", 860 → "14h 20m". */
export function formatMinutesShort(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function recommendationReason(rec: DashboardRecommendation): string {
  switch (rec.reason) {
    case "next_in_path":
      return rec.detail ? `Next in ${rec.detail}` : "Next in your learning path";
    case "next_level":
      return rec.detail ? `Because you finished ${rec.detail}` : "Your next level";
    case "same_category":
      return rec.detail ? `More ${titleCase(rec.detail)} for you` : "More like what you're learning";
    default:
      return "A great place to start";
  }
}

export function testSuggestionReason(s: DashboardTestSuggestion): string {
  switch (s.reason) {
    case "resume":
      return "You have a test in progress";
    case "finished_course":
      return s.courseTitle ? `You finished ${s.courseTitle}. Check what you learned.` : "Check what you learned";
    default:
      return s.courseTitle ? `Test yourself on ${s.courseTitle}` : "Test yourself";
  }
}
