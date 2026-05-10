import dashboard from "/icons/navItems/dashboard.svg";
import courses from "/icons/navItems/courses.svg";
import preview from "/icons/navItems/preview.svg";
import wishlists from "/icons/navItems/wishlists.svg";
import settings from "/icons/navItems/user.svg";
import support from "/icons/navItems/support.svg";
import { CURRICULUM_PREVIEW_USER_TYPES } from "@/auth";
import { PRIVATE_PATHS } from "./routePaths";

export type NavItem = {
  name: string;
  icon: string;
  path: string;
  /** If set, only users with one of these `user.userType` values see this link. */
  allowedUserTypes?: readonly string[];
};

export const navItems: NavItem[] = [
  {
    name: "Dashboard",
    icon: dashboard,
    path: PRIVATE_PATHS.DASHBOARD,
  },
  {
    name: "Courses",
    icon: courses,
    path: PRIVATE_PATHS.COURSES,
  },
  {
    name: "Curriculum preview",
    icon: preview,
    path: PRIVATE_PATHS.CURRICULUM_PREVIEW,
    allowedUserTypes: CURRICULUM_PREVIEW_USER_TYPES,
  },
  {
    name: "Wishlists",
    icon: wishlists,
    path: PRIVATE_PATHS.WISHLISTS,
  },
  {
    name: "Support",
    icon: support,
    path: PRIVATE_PATHS.SUPPORT,
  },
  {
    name: "Settings",
    icon: settings,
    path: PRIVATE_PATHS.SETTINGS,
  },

];
