/**
 * Admin → AI Tutor handoff for editing an interactive test as JSON
 * (same pattern as curriculum-edit).
 */

export type TestHandoff = {
  token: string;
  name: string;
  role?: "admin" | "teacher";
  slug?: string;
  testId?: number;
};

export type TestImportDocument = {
  test: Record<string, unknown>;
  questions: unknown[];
};

export class TestApiError extends Error {
  readonly errors?: string[];
  readonly statusCode?: number;

  constructor(
    message: string,
    options?: { errors?: string[]; statusCode?: number },
  ) {
    super(message);
    this.name = "TestApiError";
    this.errors = options?.errors;
    this.statusCode = options?.statusCode;
  }
}

function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") ||
    (import.meta.env.DEV
      ? "http://localhost:4000"
      : "https://api-pro.rydlearning.com")
  );
}

function decodeBase64JsonSegment(segment: string): Record<string, unknown> {
  const pad =
    segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const json = decodeURIComponent(escape(atob(b64)));
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid test edit handoff payload");
  }
  return parsed as Record<string, unknown>;
}

export function decodeTestHandoff(code: string): TestHandoff {
  const o = decodeBase64JsonSegment(code);
  if (!o.token || typeof o.token !== "string") {
    throw new Error("Invalid test edit handoff payload");
  }
  const role =
    o.role === "admin" || o.role === "teacher" ? o.role : undefined;
  const testId =
    typeof o.testId === "number"
      ? o.testId
      : typeof o.testId === "string" && o.testId.trim()
        ? Number(o.testId)
        : undefined;
  return {
    token: o.token,
    name: String(o.name || ""),
    role,
    slug: typeof o.slug === "string" ? o.slug : undefined,
    testId:
      typeof testId === "number" && Number.isFinite(testId) ? testId : undefined,
  };
}

export function isAdminTestEditHandoff(
  handoff: TestHandoff,
): handoff is TestHandoff & { testId: number } {
  return handoff.role === "admin" && typeof handoff.testId === "number";
}

function parseApiErrorBody(body: unknown): {
  message: string;
  errors?: string[];
} {
  if (!body || typeof body !== "object") {
    return { message: "Request failed." };
  }
  const o = body as Record<string, unknown>;
  const message =
    (typeof o.message === "string" && o.message.trim()) || "Request failed.";
  const errors = Array.isArray(o.errors)
    ? o.errors.filter((e): e is string => typeof e === "string")
    : undefined;
  return { message, errors };
}

/** Build the import/export document shape from GET /admin/ai-test/:id. */
export function buildEditableTestDocument(record: Record<string, unknown>): string {
  const curriculum =
    record.curriculum && typeof record.curriculum === "object"
      ? (record.curriculum as Record<string, unknown>)
      : null;
  const subcategory =
    record.subcategory && typeof record.subcategory === "object"
      ? (record.subcategory as Record<string, unknown>)
      : null;
  const category =
    subcategory?.category && typeof subcategory.category === "object"
      ? (subcategory.category as Record<string, unknown>)
      : null;

  const questions = Array.isArray(record.questions) ? record.questions : [];

  const doc: TestImportDocument = {
    test: {
      title: record.title ?? "",
      slug: record.slug ?? null,
      description: record.description ?? "",
      courseSlug: curriculum?.slug ?? record.courseSlug ?? null,
      categorySlug: category?.slug ?? null,
      subcategorySlug: subcategory?.slug ?? null,
      sortOrder: record.sortOrder ?? 0,
      language: record.language ?? "",
      level: record.level ?? "",
      timeLimitMinutes: record.timeLimitMinutes ?? null,
      passMark: record.passMark ?? 50,
      maxAttempts: record.maxAttempts ?? null,
      instantFeedback: record.instantFeedback !== false,
      shuffleQuestions: Boolean(record.shuffleQuestions),
      passRecommendCourseSlug: record.passRecommendCourseSlug ?? null,
      passRecommendTestSlug: record.passRecommendTestSlug ?? null,
      failRecommendCourseSlug: record.failRecommendCourseSlug ?? null,
    },
    questions: questions.map((q) => {
      const row = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
      const lessonRef =
        row.lessonRef &&
        typeof row.lessonRef === "object" &&
        (row.lessonRef as Record<string, unknown>).courseSlug
          ? row.lessonRef
          : null;
      return {
        type: row.type,
        prompt: row.prompt,
        code: row.code || "",
        payload: row.payload,
        explanation: row.explanation || "",
        points: Number(row.points) || 1,
        lessonRef,
      };
    }),
  };

  return JSON.stringify(doc, null, 2);
}

export function parseTestImportDocument(raw: string): TestImportDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new TestApiError("Invalid JSON. Fix syntax errors before saving.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new TestApiError("Test must be a JSON object.");
  }
  const obj = parsed as Record<string, unknown>;
  if (!obj.test || typeof obj.test !== "object") {
    throw new TestApiError('Missing "test" object. Use { "test": {...}, "questions": [...] }.');
  }
  if (!Array.isArray(obj.questions)) {
    throw new TestApiError('Missing "questions" array. Use { "test": {...}, "questions": [...] }.');
  }
  if (!obj.questions.length) {
    throw new TestApiError("Add at least one question before saving.");
  }
  return {
    test: obj.test as Record<string, unknown>,
    questions: obj.questions,
  };
}

export async function fetchAdminTest(
  testId: number,
  token: string,
): Promise<Record<string, unknown>> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) {
    throw new TestApiError("API URL is not configured. Set VITE_API_URL.");
  }

  const response = await fetch(
    `${apiUrl}/admin/ai-test/${encodeURIComponent(String(testId))}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  let body: { status?: boolean; message?: string; data?: unknown } | null =
    null;
  try {
    body = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: unknown;
    };
  } catch {
    body = null;
  }

  if (!response.ok || body?.status === false) {
    const { message, errors } = parseApiErrorBody(body);
    throw new TestApiError(message, {
      errors,
      statusCode: response.status,
    });
  }

  const data = body?.data;
  if (!data || typeof data !== "object") {
    throw new TestApiError("Test response did not include data.");
  }
  return data as Record<string, unknown>;
}

export async function replaceAdminTestContent(
  testId: number,
  token: string,
  document: TestImportDocument,
): Promise<void> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) {
    throw new TestApiError("API URL is not configured. Set VITE_API_URL.");
  }

  const response = await fetch(
    `${apiUrl}/admin/ai-test/${encodeURIComponent(String(testId))}/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(document),
    },
  );

  if (response.ok) return;

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const { message, errors } = parseApiErrorBody(body);
  throw new TestApiError(message, {
    errors,
    statusCode: response.status,
  });
}
