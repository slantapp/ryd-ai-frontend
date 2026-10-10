// src/lib/axios.ts
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

/** Must be absolute API host. Missing VITE_API_URL at build time posts to the SPA origin → 405. */
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "https://api-pro.rydlearning.com"
).replace(/\/$/, "");

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

axiosInstance.defaults.withCredentials = true;

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Learner's timezone so the API counts streaks and the daily goal by their local day.
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) config.headers["X-Timezone"] = timezone;
    } catch {
      // Older browsers: the API falls back to the profile timezone, then UTC.
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
