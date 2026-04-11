import {
  AuthRedirect,
  CreateProfile,
  ForgotPasswordPage,
  ResetPasswordPage,
  SelectPlatform,
  SelectProfile,
  SignInPage,
  SignUpPage,
} from "@/pages/auth";
import { PRIVATE_PATHS, PUBLIC_PATHS } from "../utils/routePaths";
import { Navigate } from "react-router-dom";
import {
  CoursesPage,
  // CodingExercise,
  SettingsPage,
  Dashboard,
  WishlistPage,
  SupportPage,
} from "@/pages/app";
import CodeExample from "@/data/CodeExample";

interface AppRoute {
  path: string;
  element: React.ReactNode;
  children?: [
    {
      path: string;
      element: React.ReactNode;
    }
  ];
}

interface AppRoute {
  path: string;
  element: React.ReactNode;
  children?: [
    {
      path: string;
      element: React.ReactNode;
    }
  ];
}

const { DASHBOARD, COURSES, COURSE_QUIZ, SETTINGS, WISHLISTS, SUPPORT } =
  PRIVATE_PATHS;

const {
  SELECT_PLATFORM,
  SELECT_PROFILE,
  CREATE_PROFILE,
  AUTH_REDIRECT,
  LOGIN,
  SIGN_UP,
  FORGOT_PASSWORD,
  RESET_PASSWORD,
} = PUBLIC_PATHS;

export const PUBLIC_ROUTES: AppRoute[] = [
  {
    path: "/",
    element: <SelectPlatform />,
  },
  {
    path: SELECT_PLATFORM,
    element: <SelectPlatform />,
  },
  {
    path: LOGIN,
    element: <SignInPage />,
  },
  {
    path: SIGN_UP,
    element: <SignUpPage />,
  },
  {
    path: FORGOT_PASSWORD,
    element: <ForgotPasswordPage />,
  },
  {
    path: RESET_PASSWORD,
    element: <ResetPasswordPage />,
  },
  {
    path: SELECT_PROFILE,
    element: <SelectProfile />,
  },
  {
    path: CREATE_PROFILE,
    element: <CreateProfile />,
  },
  {
    path: AUTH_REDIRECT,
    element: <AuthRedirect />,
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
];

export const PRIVATE_ROUTES: AppRoute[] = [
  // {
  //   path: '/',
  //   element: <Dashboard />,
  // },
  {
    path: DASHBOARD,
    element: <Dashboard />,
  },
  {
    path: COURSES,
    element: <CoursesPage />,
  },
  {
    path: COURSE_QUIZ,
    element: <CodeExample />,
  },
  {
    path: SETTINGS,
    element: <SettingsPage />,
  },
  {
    path: WISHLISTS,
    element: <WishlistPage />,
  },
  {
    path: SUPPORT,
    element: <SupportPage />,
  },
  {
    path: "*",
    element: <Navigate to={DASHBOARD} replace />,
  },
];
