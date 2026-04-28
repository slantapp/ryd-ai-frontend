// src/stores/coursesStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { curriculaData, type Curriculum } from "../data/curriculumData";
import {
  getCategoryIdForCourseSlug,
  type CourseCategoryId,
} from "../data/courseCategories";

export type CourseStatus = "not-started" | "ongoing" | "completed";

export type AgeRange = {
  min: number;
  max: number;
};

export interface Course {
  title: string;
  desc: string;
  img: string;
  slug: string;
  categoryId: CourseCategoryId;
  status: CourseStatus;
  progress?: number; // 0-100
  ageRange?: AgeRange;
  duration?: string; // e.g., "4 weeks"
  level?: "Beginner" | "Intermediate" | "Advanced";
  rating?: number; // 1-5
}

// Default images for courses (can be customized per course later)
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

// Default course metadata (can be customized per course later)
const defaultCourseMetadata: Record<
  string,
  {
    status: CourseStatus;
    progress?: number;
    ageRange?: AgeRange;
    duration?: string;
    level?: "Beginner" | "Intermediate" | "Advanced";
    rating?: number;
  }
> = {
  "intro-computer-science": {
    status: "not-started",
    progress: 45,
    ageRange: { min: 9, max: 14 },
    duration: "6 weeks",
    level: "Beginner",
    rating: 4.8,
  },
  "web-development-basics": {
    status: "not-started",
    progress: 100,
    ageRange: { min: 10, max: 16 },
    duration: "4 weeks",
    level: "Beginner",
    rating: 4.9,
  },
  "javascript-beginner": {
    status: "not-started",
    ageRange: { min: 11, max: 16 },
    duration: "5 weeks",
    level: "Beginner",
    rating: 4.6,
  },
  "web-basics": {
    status: "not-started",
    ageRange: { min: 9, max: 14 },
    duration: "3 weeks",
    level: "Beginner",
    rating: 4.5,
  },
  "javascript-intermediate": {
    status: "not-started",
    ageRange: { min: 12, max: 16 },
    duration: "6 weeks",
    level: "Intermediate",
    rating: 4.7,
  },
  "javascript-professional": {
    status: "not-started",
    ageRange: { min: 13, max: 18 },
    duration: "8 weeks",
    level: "Advanced",
    rating: 4.8,
  },
};

// Convert Curriculum to Course format
function curriculumToCourse(curriculum: Curriculum): Course {
  const metadata = defaultCourseMetadata[curriculum.slug] || {
    status: "not-started" as CourseStatus,
    ageRange: { min: 8, max: 16 },
    duration: "4 weeks",
    level: "Beginner" as const,
    rating: 4.5,
  };

  return {
    title: curriculum.curriculum.title,
    desc: curriculum.curriculum.description,
    img:
      defaultCourseImages[curriculum.slug] ||
      defaultCourseImages["intro-computer-science"],
    slug: curriculum.slug,
    categoryId: getCategoryIdForCourseSlug(curriculum.slug),
    ...metadata,
  };
}

// Generate courses data from curriculaData
export const coursesData: Course[] = curriculaData.map(curriculumToCourse);

const AUTH_PERSIST_KEY = "ryd-ai-platform-auth";
const USER_SCOPED_KEY_SEPARATOR = ":";

function getActiveUserStorageSuffix(): string {
  try {
    const raw = localStorage.getItem(AUTH_PERSIST_KEY);
    if (!raw) return "guest";
    const parsed = JSON.parse(raw) as { state?: { user?: { id?: unknown } } };
    const id = parsed?.state?.user?.id;
    if (typeof id === "string" && id.trim()) return id.trim();
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
    return "guest";
  } catch {
    return "guest";
  }
}

function userScopedKey(baseKey: string): string {
  return `${baseKey}${USER_SCOPED_KEY_SEPARATOR}${getActiveUserStorageSuffix()}`;
}

interface CourseProgressData {
  [slug: string]: {
    status: CourseStatus;
    progress: number;
    currentLessonId: string | null;
    completedLessons: string[]; // Array of completed lesson IDs
    /** Flat index in curriculum (all modules in order). */
    lessonIndex?: number;
    /** Index in current lesson's `questions` array. */
    questionIndex?: number;
    lessonStarted?: boolean;
    canStartQuestions?: boolean;
    lastUpdated?: number;
  };
}

interface CoursesState {
  wishlist: Set<string>; // Set of course slugs
  courseProgress: CourseProgressData; // Track progress for each course
  addToWishlist: (slug: string) => void;
  removeFromWishlist: (slug: string) => void;
  isInWishlist: (slug: string) => boolean;
  toggleWishlist: (slug: string) => void;
  updateCourseProgress: (
    slug: string,
    progress: Partial<CourseProgressData[string]>
  ) => void;
  getCourseProgress: (slug: string) => CourseProgressData[string] | null;
  getAllCourses: () => Course[];
  getCompletedCourses: () => Course[];
  getOngoingCourses: () => Course[];
  getEnrolledCourses: () => Course[]; // ongoing + completed
  /** Reset in-memory state (does not delete persisted data). */
  reset: () => void;
}

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set, get) => ({
      wishlist: new Set<string>(),
      courseProgress: {},
      reset: () => set({ wishlist: new Set<string>(), courseProgress: {} }),
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
        progress: Partial<CourseProgressData[string]>
      ) => {
        set((state) => {
          const currentProgress = state.courseProgress[slug] || {
            status: "not-started" as CourseStatus,
            progress: 0,
            currentLessonId: null,
            completedLessons: [],
          };
          return {
            courseProgress: {
              ...state.courseProgress,
              [slug]: {
                ...currentProgress,
                ...progress,
              },
            },
          };
        });
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
              // Completed courses always show 100% in the listing
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
            return (
              progress?.status === "completed" ||
              course.status === "completed"
            );
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
            return (
              progress?.status === "ongoing" || course.status === "ongoing"
            );
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
      name: "ryd-learning-courses", // localStorage key
      // Custom storage to handle Set serialization
      storage: {
        getItem: (name) => {
          const scoped = userScopedKey(name);
          const str = localStorage.getItem(scoped) ?? localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              wishlist: new Set(parsed.state.wishlist || []),
            },
          };
        },
        setItem: (name, value) => {
          const scoped = userScopedKey(name);
          const toStore = {
            ...value,
            state: {
              ...value.state,
              wishlist: Array.from(value.state.wishlist),
              courseProgress: value.state.courseProgress || {},
            },
          };
          localStorage.setItem(scoped, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(userScopedKey(name)),
      },
    }
  )
);
