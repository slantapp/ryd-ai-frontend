import type { CurriculumData } from "./types";
import { isCurriculumV2 } from "./v2/detect";

export type CurriculumHandoffRole = "admin" | "teacher";

export type CurriculumHandoff = {
  token: string;
  name: string;
  role?: CurriculumHandoffRole;
  slug?: string;
  curriculumId?: number;
};

export type AdminCurriculumRecord = {
  id: number;
  slug: string;
  title: string;
  description: string;
  language: string;
  isVisible: boolean;
  curriculum: unknown;
};

export type CurriculumUploadPayload = {
  slug: string;
  schema_version: number;
  curriculum: unknown;
};

export class CurriculumApiError extends Error {
  readonly errors?: string[];
  readonly statusCode?: number;

  constructor(
    message: string,
    options?: { errors?: string[]; statusCode?: number },
  ) {
    super(message);
    this.name = "CurriculumApiError";
    this.errors = options?.errors;
    this.statusCode = options?.statusCode;
  }
}

export type CurriculumCodePayload = {
  /** Curriculum record id used with GET /common/curriculum/preview/:id */
  curriculumId: string;
};

export const CURRICULUM_PREVIEW_HEADER = "x-curriculum-preview-key";

function decodeBase64JsonSegment(segment: string): Record<string, unknown> {
  const pad =
    segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const json = decodeURIComponent(escape(atob(b64)));
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid curriculum preview payload");
  }
  return parsed as Record<string, unknown>;
}

export function decodeHandoffSegment(segment: string): CurriculumHandoff {
  return decodeCurriculumHandoff(segment);
}

/** Decode `?code=` handoff payload (URL-safe base64 JSON). */
export function decodeCurriculumHandoff(code: string): CurriculumHandoff {
  const o = decodeBase64JsonSegment(code);

  if (!o.token || typeof o.token !== "string") {
    throw new Error("Invalid curriculum handoff payload");
  }

  const role =
    o.role === "admin" || o.role === "teacher"
      ? o.role
      : undefined;

  const curriculumId =
    typeof o.curriculumId === "number"
      ? o.curriculumId
      : typeof o.curriculumId === "string" && o.curriculumId.trim()
        ? Number(o.curriculumId)
        : undefined;

  return {
    token: o.token,
    name: String(o.name || ""),
    role,
    slug: typeof o.slug === "string" ? o.slug : undefined,
    curriculumId:
      typeof curriculumId === "number" && Number.isFinite(curriculumId)
        ? curriculumId
        : undefined,
  };
}

export function isAdminEditHandoff(
  handoff: CurriculumHandoff,
): handoff is CurriculumHandoff & { curriculumId: number } {
  return handoff.role === "admin" && typeof handoff.curriculumId === "number";
}

/** Decode `?curriculumCode=` — base64 of the curriculum id (`btoa(String(id))`). */
export function decodeCurriculumCode(segment: string): CurriculumCodePayload {
  const trimmed = segment.trim();
  if (!trimmed) {
    throw new Error("Invalid curriculum preview code.");
  }

  let encoded = trimmed;
  try {
    encoded = decodeURIComponent(trimmed);
  } catch {
    encoded = trimmed;
  }

  const pad =
    encoded.length % 4 === 0 ? "" : "=".repeat(4 - (encoded.length % 4));
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + pad;

  let curriculumId = "";
  try {
    curriculumId = atob(b64).trim();
  } catch {
    throw new Error("Invalid curriculum preview code.");
  }

  if (!curriculumId) {
    throw new Error("Invalid curriculum preview code: missing curriculum id");
  }

  return { curriculumId };
}

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_URL?.trim().replace(/\/$/, "") || "";
}

function encodePreviewKeyForHeader(key: string): string {
  const bytes = new TextEncoder().encode(key);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function getCurriculumPreviewKeyHeaderValue(): string {
  const key = import.meta.env.VITE_CURRICULUM_PREVIEW_KEY?.trim();
  if (!key) {
    throw new Error(
      "Curriculum preview key is not configured. Set VITE_CURRICULUM_PREVIEW_KEY.",
    );
  }
  return encodePreviewKeyForHeader(key);
}

export function extractCurriculumDataFromPreviewResponse(
  payload: unknown,
): CurriculumData {
  if (!payload || typeof payload !== "object") {
    throw new Error("Curriculum preview response was empty.");
  }

  const root = payload as Record<string, unknown>;

  if (root.curriculum && typeof root.curriculum === "object") {
    return root.curriculum as CurriculumData;
  }

  if (Array.isArray(root.modules)) {
    return root as unknown as CurriculumData;
  }

  if (typeof root.content === "string") {
    const parsed = JSON.parse(root.content) as unknown;
    return extractCurriculumDataFromPreviewResponse(parsed);
  }

  if (typeof root.content === "object" && root.content) {
    return extractCurriculumDataFromPreviewResponse(root.content);
  }

  throw new Error(
    "Curriculum preview response did not include curriculum data.",
  );
}

export async function fetchCurriculumPreview(
  curriculumId: string,
): Promise<CurriculumData> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) {
    throw new Error("API URL is not configured. Set VITE_API_URL.");
  }

  const response = await fetch(
    `${apiUrl}/common/curriculum/preview/${encodeURIComponent(curriculumId)}`,
    {
      method: "GET",
      headers: {
        [CURRICULUM_PREVIEW_HEADER]: getCurriculumPreviewKeyHeaderValue(),
      },
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
    const message =
      (typeof body?.message === "string" && body.message.trim()) ||
      `Could not load curriculum preview (${response.status}).`;
    throw new Error(message);
  }

  return extractCurriculumDataFromPreviewResponse(body?.data ?? body);
}

export async function uploadCurriculumFile(file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const apiUrl = getApiBaseUrl();
  if (!apiUrl) {
    throw new Error("API URL is not configured. Set VITE_API_URL.");
  }

  const response = await fetch(`${apiUrl}/teacher/curriculum/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (response.ok) return;

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const { message, errors } = parseApiErrorBody(body);
  throw new CurriculumApiError(message, {
    errors,
    statusCode: response.status,
  });
}

function parseApiErrorBody(body: unknown): {
  message: string;
  errors?: string[];
} {
  if (!body || typeof body !== "object") {
    return { message: "Request failed." };
  }
  const root = body as Record<string, unknown>;
  const message =
    (typeof root.message === "string" && root.message.trim()) ||
    "Request failed.";

  const data = root.data;
  if (data && typeof data === "object" && Array.isArray((data as Record<string, unknown>).errors)) {
    const errors = (data as { errors: unknown[] }).errors.filter(
      (e): e is string => typeof e === "string" && e.trim().length > 0,
    );
    if (errors.length > 0) {
      return { message, errors };
    }
  }

  return { message };
}

export function buildEditableCurriculumDocument(
  record: Pick<AdminCurriculumRecord, "slug" | "curriculum">,
): string {
  const schema_version = isCurriculumV2(record.curriculum) ? 2 : 1;
  return JSON.stringify(
    {
      slug: record.slug,
      schema_version,
      curriculum: record.curriculum,
    },
    null,
    2,
  );
}

export function parseCurriculumUploadPayload(raw: string): CurriculumUploadPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CurriculumApiError(
      "Invalid JSON. Fix syntax errors before saving.",
    );
  }

  if (!parsed || typeof parsed !== "object") {
    throw new CurriculumApiError("Curriculum must be a JSON object.");
  }

  const obj = parsed as Record<string, unknown>;
  const slug = typeof obj.slug === "string" ? obj.slug.trim() : "";
  if (!slug) {
    throw new CurriculumApiError("Missing or empty 'slug' field.");
  }

  const curriculum = obj.curriculum;
  if (!curriculum || typeof curriculum !== "object") {
    throw new CurriculumApiError("Missing 'curriculum' object.");
  }

  const schema_version =
    typeof obj.schema_version === "number" && Number.isFinite(obj.schema_version)
      ? obj.schema_version
      : isCurriculumV2(curriculum)
        ? 2
        : 1;

  return { slug, schema_version, curriculum };
}

export async function fetchAdminCurriculum(
  curriculumId: number,
  token: string,
): Promise<AdminCurriculumRecord> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) {
    throw new CurriculumApiError("API URL is not configured. Set VITE_API_URL.");
  }

  const response = await fetch(
    `${apiUrl}/admin/curriculum/${encodeURIComponent(String(curriculumId))}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    throw new CurriculumApiError(message, {
      errors,
      statusCode: response.status,
    });
  }

  const data = body?.data;
  if (!data || typeof data !== "object") {
    throw new CurriculumApiError("Curriculum response did not include data.");
  }

  const record = data as Record<string, unknown>;
  const id = typeof record.id === "number" ? record.id : curriculumId;
  const slug = typeof record.slug === "string" ? record.slug : "";
  if (!slug || !record.curriculum) {
    throw new CurriculumApiError(
      "Curriculum response is missing slug or curriculum content.",
    );
  }

  return {
    id,
    slug,
    title: typeof record.title === "string" ? record.title : "",
    description: typeof record.description === "string" ? record.description : "",
    language: typeof record.language === "string" ? record.language : "en",
    isVisible: Boolean(record.isVisible),
    curriculum: record.curriculum,
  };
}

export async function updateAdminCurriculum(
  curriculumId: number,
  token: string,
  payload: CurriculumUploadPayload,
): Promise<void> {
  const apiUrl = getApiBaseUrl();
  if (!apiUrl) {
    throw new CurriculumApiError("API URL is not configured. Set VITE_API_URL.");
  }

  const response = await fetch(
    `${apiUrl}/admin/curriculum/${encodeURIComponent(String(curriculumId))}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
  throw new CurriculumApiError(message, {
    errors,
    statusCode: response.status,
  });
}

export async function uploadCurriculumJson(
  json: string,
  token: string,
): Promise<void> {
  const file = new File([json], "curriculum.json", {
    type: "application/json",
  });
  await uploadCurriculumFile(file, token);
}
