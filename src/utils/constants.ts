import dashboard from "/icons/navItems/dashboard.svg";
import courses from "/icons/navItems/courses.svg";
import wishlists from "/icons/navItems/wishlists.svg";
import settings from "/icons/navItems/user.svg";
import support from "/icons/navItems/support.svg";
import { PRIVATE_PATHS } from "./routePaths";

export const navItems = [
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
