// src/stores/coursesStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { curriculaData, type Curriculum } from "../data/curriculumData";
import { type CourseCategoryId } from "../data/courseCategories";
import type { CourseProgressRecord } from "@/api/courseProgress";
import {
  fetchAllCourseProgress as fetchAllCourseProgressRequest,
  fetchCourseProgress as fetchCourseProgressRequest,
  upsertCourseProgress as upsertCourseProgressRequest,
  type CourseProgressPutBody,
} from "@/api/courseProgress";

export type CourseStatus = "not-started" | "ongoing" | "completed";

export interface Course {
  title: string;
  desc: string;
  img: string;
  slug: string;
  categoryId: CourseCategoryId;
  status: CourseStatus;
  progress?: number; // 0-100
  /** Minimum recommended age; shown on cards as e.g. "8+". */
  minAge?: number;
  /** Local school class from curriculum JSON, e.g. "Primary 5". */
  class?: string;
  /** International grade number from curriculum JSON (1–12). */
  grade?: number;
  duration?: string;
  level?: "Beginner" | "Intermediate" | "Advanced";
  rating?: number;
}

const defaultCourseImages: Record<string, string> = {
  "intro-computer-science":
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop",
  "web-development-basics":
    "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=200&fit=crop",
  "css-basics":
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop",
  "html-css-combined":
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop",
  "javascript-beginner":
    "https://images.unsplash.com/photo-1627398242454-45a5d1b07c2c?w=400&h=200&fit=crop",
  "web-basics":
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=200&fit=crop",
  "javascript-intermediate":
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop",
  "javascript-professional":
    "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=400&h=200&fit=crop",
  "data-structures-algorithms":
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop",
  "python-programming":
    "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=200&fit=crop",
  "python-beginner":
    "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=200&fit=crop",
  "python-intermediate":
    "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=200&fit=crop",
  "python-advance":
    "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=200&fit=crop",
  "css_flex_grid_lessons":
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop",
  "javascript-fundamentals":
    "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=400&h=200&fit=crop",
  "machine-learning-basics":
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=200&fit=crop",
  "ui-ux-design-principles":
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop",
  "mobile-app-development":
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=200&fit=crop",
  "database-management":
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop",
  "software-engineering":
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop",
};

/** Static listing metadata only — progress comes from API via `courseProgress`. */
const defaultCourseMetadata: Record<
  string,
  {
    minAge?: number;
    duration?: string;
    level?: "Beginner" | "Intermediate" | "Advanced";
    rating?: number;
  }
> = {
  "intro-computer-science": {
    minAge: 9,
    duration: "6 weeks",
    level: "Beginner",
    rating: 4.8,
  },
  "web-development-basics": {
    minAge: 10,
    duration: "4 weeks",
    level: "Beginner",
    rating: 4.9,
  },
  "javascript-beginner": {
    minAge: 11,
    duration: "5 weeks",
    level: "Beginner",
    rating: 4.6,
  },
  "web-basics": {
    minAge: 9,
    duration: "3 weeks",
    level: "Beginner",
    rating: 4.5,
  },
  "javascript-intermediate": {
    minAge: 12,
    duration: "6 weeks",
    level: "Intermediate",
    rating: 4.7,
  },
  "javascript-professional": {
    minAge: 13,
    duration: "8 weeks",
    level: "Advanced",
    rating: 4.8,
  },
  "python-beginner": {
    minAge: 9,
    duration: "6 weeks",
    level: "Beginner",
    rating: 4.7,
  },
  "python-intermediate": {
    minAge: 12,
    duration: "8 weeks",
    level: "Intermediate",
    rating: 4.8,
  },
  "python-advance": {
    minAge: 14,
    duration: "10 weeks",
    level: "Advanced",
    rating: 4.9,
  },
  "css_flex_grid_lessons": {
    minAge: 10,
    duration: "4 weeks",
    level: "Intermediate",
    rating: 4.7,
  },
};

function curriculumToCourse(curriculum: Curriculum): Course {
  const metadata = defaultCourseMetadata[curriculum.slug] || {
    duration: "4 weeks",
    level: "Beginner" as const,
    rating: 4.5,
  };

  const { category, age, class: schoolClass, grade } = curriculum.curriculum;

  return {
    title: curriculum.curriculum.title,
    desc: curriculum.curriculum.description,
    img:
      defaultCourseImages[curriculum.slug] ||
      defaultCourseImages["intro-computer-science"],
    slug: curriculum.slug,
    categoryId: (category as CourseCategoryId) || "coding",
    status: "not-started",
    ...metadata,
    minAge:
      typeof age === "number" && Number.isFinite(age)
        ? age
        : (metadata.minAge ?? 8),
    class: typeof schoolClass === "string" ? schoolClass : undefined,
    grade:
      typeof grade === "number" && Number.isFinite(grade) && grade > 0
        ? grade
        : undefined,
  };
}

export const coursesData: Course[] = curriculaData.map(curriculumToCourse);

export interface CourseProgressDataEntry {
  status: CourseStatus;
  progress: number;
  currentLessonId: string | null;
  completedLessons: string[];
  lessonIndex?: number;
  questionIndex?: number;
  lessonStarted?: boolean;
  canStartQuestions?: boolean;
  lastUpdated?: number;
}

interface CourseProgressData {
  [slug: string]: CourseProgressDataEntry;
}

function apiRecordToEntry(rec: CourseProgressRecord): CourseProgressDataEntry {
  return {
    status: rec.status,
    progress: rec.progressPercent,
    currentLessonId: rec.currentLessonId,
    completedLessons: rec.completedLessonIds ?? [],
    lessonIndex: rec.lessonIndex ?? undefined,
    questionIndex: rec.questionIndex ?? undefined,
    lessonStarted: rec.lessonStarted,
    canStartQuestions: rec.canStartQuestions,
    lastUpdated: rec.clientUpdatedAt ?? undefined,
  };
}

function entryToPutBody(
  entry: CourseProgressDataEntry,
  clientUpdatedAt: number
): CourseProgressPutBody {
  const body: CourseProgressPutBody = {
    clientUpdatedAt,
    status: entry.status,
    progressPercent: entry.progress,
    currentLessonId: entry.currentLessonId,
    completedLessonIds: entry.completedLessons,
    lessonStarted: entry.lessonStarted,
    canStartQuestions: entry.canStartQuestions,
  };
  if (typeof entry.lessonIndex === "number") {
    body.lessonIndex = entry.lessonIndex;
  }
  if (typeof entry.questionIndex === "number") {
    body.questionIndex = entry.questionIndex;
  }
  return body;
}

const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearPersistTimer(slug: string) {
  const t = persistTimers.get(slug);
  if (t) {
    clearTimeout(t);
    persistTimers.delete(slug);
  }
}

interface CoursesState {
  wishlist: Set<string>;
  courseProgress: CourseProgressData;
  addToWishlist: (slug: string) => void;
  removeFromWishlist: (slug: string) => void;
  isInWishlist: (slug: string) => boolean;
  toggleWishlist: (slug: string) => void;
  updateCourseProgress: (
    slug: string,
    progress: Partial<CourseProgressDataEntry>,
    options?: { immediate?: boolean }
  ) => void;
  getCourseProgress: (slug: string) => CourseProgressDataEntry | null;
  fetchAllCourseProgress: () => Promise<void>;
  hydrateCourseProgressFromApi: (slug: string) => Promise<void>;
  getAllCourses: () => Course[];
  getCompletedCourses: () => Course[];
  getOngoingCourses: () => Course[];
  getEnrolledCourses: () => Course[];
  reset: () => void;
}

async function flushProgressToApi(
  slug: string,
  get: () => CoursesState,
  set: (
    partial:
      | Partial<CoursesState>
      | ((state: CoursesState) => Partial<CoursesState>)
  ) => void
) {
  const entry = get().courseProgress[slug];
  if (!entry) return;

  const clientUpdatedAt = Date.now();

  try {
    const res = await upsertCourseProgressRequest(
      slug,
      entryToPutBody(entry, clientUpdatedAt)
    );
    if (!res.status || !res.data) {
      throw new Error(res.message || "Course progress save failed");
    }
    const merged = apiRecordToEntry(res.data);
    set((state) => ({
      courseProgress: {
        ...state.courseProgress,
        [slug]: merged,
      },
    }));
  } catch {
    try {
      const res = await fetchCourseProgressRequest(slug);
      if (res.status && res.data) {
        const merged = apiRecordToEntry(res.data);
        set((state) => ({
          courseProgress: {
            ...state.courseProgress,
            [slug]: merged,
          },
        }));
      }
    } catch {
      /* ignore */
    }
  }
}

function scheduleFlush(
  slug: string,
  get: () => CoursesState,
  set: (
    partial:
      | Partial<CoursesState>
      | ((state: CoursesState) => Partial<CoursesState>)
  ) => void
) {
  clearPersistTimer(slug);
  persistTimers.set(
    slug,
    setTimeout(() => {
      persistTimers.delete(slug);
      void flushProgressToApi(slug, get, set);
    }, 450)
  );
}

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set, get) => ({
      wishlist: new Set<string>(),
      courseProgress: {},
      reset: () => {
        persistTimers.forEach((t) => clearTimeout(t));
        persistTimers.clear();
        set({ wishlist: new Set<string>(), courseProgress: {} });
      },
      fetchAllCourseProgress: async () => {
        try {
          const res = await fetchAllCourseProgressRequest();
          if (!res.status || !res.data) return;
          const next: CourseProgressData = {};
          for (const [slug, rec] of Object.entries(res.data)) {
            next[slug] = apiRecordToEntry(rec);
          }
          set({ courseProgress: next });
        } catch {
          /* ignore — dashboard still usable */
        }
      },
      hydrateCourseProgressFromApi: async (slug: string) => {
        try {
          const res = await fetchCourseProgressRequest(slug);
          if (!res.status || !res.data) return;
          const merged = apiRecordToEntry(res.data);
          set((state) => ({
            courseProgress: {
              ...state.courseProgress,
              [slug]: merged,
            },
          }));
        } catch {
          /* ignore */
        }
      },
      addToWishlist: (slug: string) => {
        set((state) => {
          const newWishlist = new Set(state.wishlist);
          newWishlist.add(slug);
          return { wishlist: newWishlist };
        });
      },
      removeFromWishlist: (slug: string) => {
        set((state) => {
          const newWishlist = new Set(state.wishlist);
          newWishlist.delete(slug);
          return { wishlist: newWishlist };
        });
      },
      isInWishlist: (slug: string) => {
        return get().wishlist.has(slug);
      },
      toggleWishlist: (slug: string) => {
        const state = get();
        if (state.wishlist.has(slug)) {
          state.removeFromWishlist(slug);
        } else {
          state.addToWishlist(slug);
        }
      },
      updateCourseProgress: (
        slug: string,
        progress: Partial<CourseProgressDataEntry>,
        options?: { immediate?: boolean }
      ) => {
        set((state) => {
          const currentProgress = state.courseProgress[slug] || {
            status: "not-started" as CourseStatus,
            progress: 0,
            currentLessonId: null,
            completedLessons: [],
          };

          const merged: CourseProgressDataEntry = {
            ...currentProgress,
            ...progress,
            completedLessons:
              progress.completedLessons ?? currentProgress.completedLessons,
            currentLessonId:
              progress.currentLessonId !== undefined
                ? progress.currentLessonId
                : currentProgress.currentLessonId,
            lastUpdated: Date.now(),
          };

          return {
            courseProgress: {
              ...state.courseProgress,
              [slug]: merged,
            },
          };
        });
        if (options?.immediate) {
          clearPersistTimer(slug);
          void flushProgressToApi(slug, get, set);
        } else {
          scheduleFlush(slug, get, set);
        }
      },
      getCourseProgress: (slug: string) => {
        return get().courseProgress[slug] || null;
      },
      getAllCourses: () => {
        const state = get();
        return coursesData.map((course) => {
          const progress = state.courseProgress[course.slug];
          if (progress) {
            return {
              ...course,
              status: progress.status,
              progress:
                progress.status === "completed" ? 100 : progress.progress,
            };
          }
          return course;
        });
      },
      getCompletedCourses: () => {
        const state = get();
        return coursesData
          .filter((course) => {
            const progress = state.courseProgress[course.slug];
            return progress?.status === "completed";
          })
          .map((course) => {
            const progress = state.courseProgress[course.slug];
            if (progress) {
              return {
                ...course,
                status: progress.status,
                progress:
                  progress.status === "completed" ? 100 : progress.progress,
              };
            }
            return course;
          });
      },
      getOngoingCourses: () => {
        const state = get();
        return coursesData
          .filter((course) => {
            const progress = state.courseProgress[course.slug];
            return progress?.status === "ongoing";
          })
          .map((course) => {
            const progress = state.courseProgress[course.slug];
            if (progress) {
              return {
                ...course,
                status: progress.status,
                progress: progress.progress,
              };
            }
            return course;
          });
      },
      getEnrolledCourses: () => {
        const state = get();
        return coursesData.filter((course) => {
          const progress = state.courseProgress[course.slug];
          const status = progress?.status || course.status;
          return status === "ongoing" || status === "completed";
        });
      },
    }),
    {
      name: "ryd-learning-courses",
      partialize: (state) => ({
        wishlist: Array.from(state.wishlist),
      }),
      merge: (persistedState, currentState) => {
        const p = persistedState as { wishlist?: string[] } | undefined;
        return {
          ...currentState,
          wishlist: new Set(Array.isArray(p?.wishlist) ? p.wishlist : []),
          courseProgress: currentState.courseProgress,
        };
      },
    }
  )
);
