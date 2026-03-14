import { useAuthStore } from "@/stores/authStore";
import { useEffect, type ReactNode } from "react";
import {
  useQueryClient,
  type QueryCacheNotifyEvent,
} from "@tanstack/react-query";
import { toast } from "react-toastify";

interface ApiError {
  response?: {
    status?: number;
  };
  status?: number;
  code?: string;
}

const AuthGuard = ({ children }: { children: ReactNode }) => {
  const handleLogout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = queryClient
      .getQueryCache()
      .subscribe((event: QueryCacheNotifyEvent) => {
        if (event.type === "updated" && event.query?.state?.error) {
          const error = event.query.state.error as ApiError;
          console.log("Query error detected:", error);

          const status = error?.response?.status || error?.status || null;
          console.log("Error status:", status);

          if (
            status === 401 ||
            (error?.code === "ERR_BAD_REQUEST" && status === 401)
          ) {
            console.log("Unauthorized access detected (401) - logging out");
            toast.error("Your session has expired. Please log in again.");
            handleLogout();
          }
        }
      });

    return () => {
      unsubscribe();
    };
  }, [queryClient, handleLogout]);

  return children;
};

export default AuthGuard;
