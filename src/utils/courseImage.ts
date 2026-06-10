import type { CourseCategoryId } from "@/data/courseCategories";

const IMAGE_WIDTH = 400;
const IMAGE_HEIGHT = 200;

/** Verified Unsplash URLs (HEAD-checked) grouped by topic. */
const TOPIC_IMAGE_POOLS: Array<{
  pattern: RegExp;
  urls: string[];
}> = [
  {
    pattern: /\bjavascript\b|\bjs\b/i,
    urls: [
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=200&fit=crop&auto=format",
    ],
  },
  {
    pattern: /\bpython\b/i,
    urls: [
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=200&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop&auto=format",
    ],
  },
  {
    pattern: /\bcss\b|\bhtml\b|\bweb\b|\bfrontend\b|\breact\b/i,
    urls: [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop&auto=format",
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=200&fit=crop&auto=format",
    ],
  },
  {
    pattern: /\bmath|\balgebra\b|\bgeometry\b|\barithmetic\b|\bnumber/i,
    urls: [
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=200&fit=crop&auto=format",
    ],
  },
  {
    pattern: /\benglish\b|\bgrammar\b|\bwriting\b|\bread/i,
    urls: [
      "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=200&fit=crop&auto=format",
    ],
  },
  {
    pattern: /\bdesign\b|\bui\b|\bux\b/i,
    urls: [
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop&auto=format",
    ],
  },
  {
    pattern: /\bdata\b|\bdatabase\b|\bmachine learning\b|\bai\b/i,
    urls: [
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop&auto=format",
    ],
  },
  {
    pattern: /\bmobile\b|\bapp\b|\bandroid\b|\bios\b/i,
    urls: [
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=200&fit=crop&auto=format",
    ],
  },
];

const CATEGORY_IMAGE_POOLS: Record<CourseCategoryId, string[]> = {
  coding: [
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop&auto=format",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop&auto=format",
  ],
  mathematics: [
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=200&fit=crop&auto=format",
  ],
  english: [
    "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=200&fit=crop&auto=format",
  ],
  design: [
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop&auto=format",
  ],
  data: [
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=200&fit=crop&auto=format",
  ],
  careers: [
    "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=200&fit=crop&auto=format",
  ],
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop&auto=format";

const imageCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickFromPool(pool: string[], seed: string): string {
  if (pool.length === 0) return DEFAULT_IMAGE;
  return pool[hashString(seed) % pool.length];
}

/** Build a search query from the curriculum title and category. */
export function buildCourseImageSearchQuery(
  title: string,
  categoryId: CourseCategoryId,
): string {
  const cleaned = title
    .replace(/\b(for|the|and|with|course|curriculum|absolute|basics?|beginners?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const categoryHint: Record<CourseCategoryId, string> = {
    coding: "programming code",
    mathematics: "mathematics education",
    english: "english language learning",
    design: "design creative",
    data: "data science technology",
    careers: "career education",
  };

  return `${cleaned} ${categoryHint[categoryId]}`.trim();
}

/** Immediate, title-aware fallback using verified image pools. */
export function getCourseImageFallback(
  title: string,
  categoryId: CourseCategoryId,
): string {
  for (const topic of TOPIC_IMAGE_POOLS) {
    if (topic.pattern.test(title)) {
      return pickFromPool(topic.urls, title);
    }
  }
  return pickFromPool(CATEGORY_IMAGE_POOLS[categoryId] ?? [DEFAULT_IMAGE], title);
}

function formatUnsplashUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.searchParams.set("w", String(IMAGE_WIDTH));
  url.searchParams.set("h", String(IMAGE_HEIGHT));
  url.searchParams.set("fit", "crop");
  url.searchParams.set("auto", "format");
  return url.toString();
}

export function canLoadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

async function searchUnsplashImage(query: string): Promise<string | null> {
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;

  try {
    const params = new URLSearchParams({
      query,
      per_page: "5",
      orientation: "landscape",
      content_filter: "high",
    });
    const res = await fetch(
      `https://api.unsplash.com/search/photos?${params.toString()}`,
      {
        headers: { Authorization: `Client-ID ${accessKey}` },
      },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: Array<{ urls?: { small?: string; regular?: string } }>;
    };

    for (const result of data.results ?? []) {
      const candidate = result.urls?.regular ?? result.urls?.small;
      if (!candidate) continue;
      const formatted = formatUnsplashUrl(candidate);
      if (await canLoadImage(formatted)) return formatted;
    }
  } catch {
    /* fall through to local fallback */
  }

  return null;
}

/** Resolve a course image from title (cached). Uses Unsplash search when configured. */
export async function resolveCourseImage(
  slug: string,
  title: string,
  categoryId: CourseCategoryId,
): Promise<string> {
  const cached = imageCache.get(slug);
  if (cached) return cached;

  const pending = inflight.get(slug);
  if (pending) return pending;

  const task = (async () => {
    const fallback = getCourseImageFallback(title, categoryId);
    const query = buildCourseImageSearchQuery(title, categoryId);
    const searched = await searchUnsplashImage(query);
    const resolved = searched ?? fallback;

    if (!(await canLoadImage(resolved))) {
      imageCache.set(slug, DEFAULT_IMAGE);
      return DEFAULT_IMAGE;
    }

    imageCache.set(slug, resolved);
    return resolved;
  })();

  inflight.set(slug, task);
  try {
    return await task;
  } finally {
    inflight.delete(slug);
  }
}

export function getCachedCourseImage(slug: string): string | undefined {
  return imageCache.get(slug);
}

export async function resolveCourseImages(
  courses: Array<{ slug: string; title: string; categoryId: CourseCategoryId }>,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    courses.map(async (course) => {
      const url = await resolveCourseImage(
        course.slug,
        course.title,
        course.categoryId,
      );
      return [course.slug, url] as const;
    }),
  );
  return Object.fromEntries(entries);
}
