/** Picklist for optional "How did you hear about us?" on sign-up. */
export const HEAR_ABOUT_US_OPTIONS = [
  { value: "Google", label: "Google" },
  { value: "Group Chats", label: "Group Chats" },
  { value: "Friends", label: "Friends" },
  { value: "Social Media", label: "Social Media" },
  { value: "Others", label: "Others" },
] as const;

export type HearAboutUsValue = (typeof HEAR_ABOUT_US_OPTIONS)[number]["value"];
