/** Main RYD app — parent sign-in (sso / return to AI LMS flows start here). */
export const RYD_PARENT_SIGN_IN_URL =
  "https://app.rydlearning.com/parent/sign-in";

export const PUBLIC_PATHS = {
  SELECT_PLATFORM: "/select-platform",
  SELECT_PROFILE: "/select-profile",
  CREATE_PROFILE: "/create-profile",
  AUTH_REDIRECT: "/auth/redirect",
};

export const PRIVATE_PATHS = {
  DASHBOARD: "/dashboard",
  COURSES: "/courses",
  COURSE_QUIZ: "/courses/:exercise",
  WISHLISTS: "/wishlists",
  QUIZ_ATTEMPTS: "/quiz-attempts",
  ANALYTICS: "analytics",
  PROFILE: "/profile",
  SUPPORT: "/support",
  SETTINGS: "/settings",
};

export const ACTION = {
  APPROVE: "/approve",
  REJECT: "/reject",
};
