import { useEffect, useState } from "react";
import { fetchDashboard, type DashboardData } from "@/api/dashboard";

export type DashboardState =
  | { status: "loading"; data: null }
  | { status: "ready"; data: DashboardData }
  | { status: "error"; data: null };

/** Loads `GET /parent/dashboard` once per visit to the page. */
export function useDashboard(): DashboardState {
  const [state, setState] = useState<DashboardState>({ status: "loading", data: null });

  useEffect(() => {
    let cancelled = false;
    fetchDashboard()
      .then((res) => {
        if (cancelled) return;
        setState(res?.status && res.data ? { status: "ready", data: res.data } : { status: "error", data: null });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", data: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
