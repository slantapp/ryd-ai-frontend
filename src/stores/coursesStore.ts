// src/stores/coursesStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getAllCurricula,
  isDemoCourseSlug,
  setRemoteCurricula,
  type Curriculum,
  type CurriculumEntry,
} from "../data/curriculumData";
import {
  resolveCourseCategoryId,
  type CourseCategoryId,
} from "../data/courseCategories";
import type { CourseProgressRecord } from "@/api/courseProgress";
import {
  fetchAllCourseProgress as fetchAllCourseProgressRequest,
  fetchCourseProgress as fetchCourseProgressRequest,
  upsertCourseProgress as upsertCourseProgressRequest,
  type CourseProgressPutBody,
} from "@/api/courseProgress";
import { fetchVisibleCurriculums as fetchVisibleCurriculumsRequest } from "@/api/curriculum";
import {
  getCourseImageFallback,
  resolveCourseImages as resolveCourseImagesRequest,
} from "@/utils/courseImage";

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

/** Static listing metadata only — progress comes from API via `courseProgress`. */
function curriculumToCourse(
  curriculum: Curriculum,
  courseImages: Record<string, string>,
): Course {
  const {
    category,
    age,
    class: schoolClass,
    grade,
    title,
    duration,
    level,
    rating,
  } = curriculum.curriculum;
  const categoryId = resolveCourseCategoryId(category, title);

  return {
    title,
    desc: curriculum.curriculum.description,
    img:
      courseImages[curriculum.slug] ??
      getCourseImageFallback(title, categoryId),
    slug: curriculum.slug,
    categoryId,
    status: "not-started",
    duration: duration ?? "4 weeks",
    level: level ?? "Beginner",
    rating:
      typeof rating === "number" && Number.isFinite(rating) ? rating : 4.5,
    minAge: typeof age === "number" && Number.isFinite(age) ? age : 8,
    class: typeof schoolClass === "string" ? schoolClass : undefined,
    grade:
      typeof grade === "number" && Number.isFinite(grade) && grade > 0
        ? grade
        : undefined,
  };
}

function buildCoursesFromCurricula(
  curricula: Curriculum[],
  courseImages: Record<string, string>,
): Course[] {
  return curricula.map((curriculum) =>
    curriculumToCourse(curriculum, courseImages),
  );
}

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
  clientUpdatedAt: number,
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
  /** Bumped when visible curriculums are loaded from the API. */
  curriculaRevision: number;
  curriculaLoading: boolean;
  curriculaFetched: boolean;
  /** Bumped when async course images finish resolving. */
  courseImagesRevision: number;
  courseImages: Record<string, string>;
  addToWishlist: (slug: string) => void;
  removeFromWishlist: (slug: string) => void;
  isInWishlist: (slug: string) => boolean;
  toggleWishlist: (slug: string) => void;
  updateCourseProgress: (
    slug: string,
    progress: Partial<CourseProgressDataEntry>,
    options?: { immediate?: boolean },
  ) => void;
  getCourseProgress: (slug: string) => CourseProgressDataEntry | null;
  fetchAllCourseProgress: () => Promise<void>;
  fetchVisibleCurriculums: () => Promise<void>;
  resolveCourseImages: () => Promise<void>;
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
      | ((state: CoursesState) => Partial<CoursesState>),
  ) => void,
) {
  const entry = get().courseProgress[slug];
  if (!entry) return;

  const clientUpdatedAt = Date.now();

  try {
    const res = await upsertCourseProgressRequest(
      slug,
      entryToPutBody(entry, clientUpdatedAt),
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
      | ((state: CoursesState) => Partial<CoursesState>),
  ) => void,
) {
  clearPersistTimer(slug);
  persistTimers.set(
    slug,
    setTimeout(() => {
      persistTimers.delete(slug);
      void flushProgressToApi(slug, get, set);
    }, 450),
  );
}

export const useCoursesStore = create<CoursesState>()(
  persist(
    (set, get) => ({
      wishlist: new Set<string>(),
      courseProgress: {},
      curriculaRevision: 0,
      curriculaLoading: false,
      curriculaFetched: false,
      courseImagesRevision: 0,
      courseImages: {},
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
      fetchVisibleCurriculums: async () => {
        set({ curriculaLoading: true });
        try {
          const res = await fetchVisibleCurriculumsRequest();
          if (!res.status || !Array.isArray(res.data)) {
            set({ curriculaFetched: true, curriculaLoading: false });
            return;
          }
          setRemoteCurricula(res.data as CurriculumEntry[]);
          set((state) => ({
            curriculaRevision: state.curriculaRevision + 1,
            curriculaFetched: true,
            curriculaLoading: false,
          }));
          await get().resolveCourseImages();
        } catch {
          set({ curriculaFetched: true, curriculaLoading: false });
        }
      },
      resolveCourseImages: async () => {
        const curricula = getAllCurricula();
        const resolved = await resolveCourseImagesRequest(
          curricula.map((curriculum) => ({
            slug: curriculum.slug,
            title: curriculum.curriculum.title,
            categoryId: resolveCourseCategoryId(
              curriculum.curriculum.category,
              curriculum.curriculum.title,
            ),
          })),
        );
        set((state) => ({
          courseImages: { ...state.courseImages, ...resolved },
          courseImagesRevision: state.courseImagesRevision + 1,
        }));
      },
      hydrateCourseProgressFromApi: async (slug: string) => {
        if (isDemoCourseSlug(slug)) return;
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
        options?: { immediate?: boolean },
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
          if (!isDemoCourseSlug(slug)) {
            void flushProgressToApi(slug, get, set);
          }
        } else if (!isDemoCourseSlug(slug)) {
          scheduleFlush(slug, get, set);
        }
      },
      getCourseProgress: (slug: string) => {
        return get().courseProgress[slug] || null;
      },
      getAllCourses: () => {
        const state = get();
        return buildCoursesFromCurricula(
          getAllCurricula(),
          state.courseImages,
        ).map((course) => {
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
        return buildCoursesFromCurricula(getAllCurricula(), state.courseImages)
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
        return buildCoursesFromCurricula(getAllCurricula(), state.courseImages)
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
        return buildCoursesFromCurricula(
          getAllCurricula(),
          state.courseImages,
        ).filter((course) => {
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
        const savedWishlist = (
          persistedState as { wishlist?: string[] } | undefined
        )?.wishlist;
        return {
          ...currentState,
          wishlist: new Set(Array.isArray(savedWishlist) ? savedWishlist : []),
          courseProgress: currentState.courseProgress,
        };
      },
    },
  ),
);
