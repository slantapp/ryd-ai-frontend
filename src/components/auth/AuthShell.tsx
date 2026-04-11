import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PUBLIC_PATHS } from "@/utils/routePaths";

type AuthShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

/**
 * Centered panel for login / register / recovery — matches AI platform cards (Solway, rounded-20px).
 */
export function AuthShell({ children, title, subtitle }: AuthShellProps) {
  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
      <div className="rounded-[20px] border border-white/60 bg-white/95 p-6 shadow-lg shadow-primary/5 ring-1 ring-[#0A090B]/5 backdrop-blur-sm sm:p-8">
        <h1 className="text-center font-solway text-2xl font-bold tracking-tight text-[#0A090B] sm:text-[26px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-center font-inter text-sm leading-relaxed text-[#4F4D55]">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-8">{children}</div>
      </div>
      <Link
        to={PUBLIC_PATHS.SELECT_PLATFORM}
        className="mt-6 text-center font-inter text-sm font-medium text-primary hover:underline"
      >
        ← Back to platforms
      </Link>
    </div>
  );
}
