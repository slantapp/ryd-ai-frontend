import type { CurriculumData } from "./types";

export type CurriculumHandoff = {
  token: string;
  name: string;
};

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
  const o = decodeBase64JsonSegment(segment);

  if (!o.token || typeof o.token !== "string") {
    throw new Error("Invalid curriculum handoff payload");
  }

  return { token: o.token, name: String(o.name || "") };
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
  const body = new FormData();
  body.append("file", file);

  const apiUrl = getApiBaseUrl();
  if (!apiUrl) {
    throw new Error("API URL is not configured. Set VITE_API_URL.");
  }

  const response = await fetch(`${apiUrl}/teacher/curriculum/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (response.ok) return;

  let message = "Could not validate your curriculum upload.";
  try {
    const data = (await response.json()) as {
      message?: unknown;
      error?: unknown;
    };
    const apiMessage = data.message ?? data.error;
    if (typeof apiMessage === "string" && apiMessage.trim()) {
      message = apiMessage;
    }
  } catch {
    // Some API errors may not return JSON.
  }

  throw new Error(message);
}
