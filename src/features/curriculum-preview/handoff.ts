export type CurriculumHandoff = {
  token: string;
  name: string;
};

export function decodeHandoffSegment(segment: string): CurriculumHandoff {
  const pad = segment.length % 4 === 0 ? "" : "=".repeat(4 - (segment.length % 4));
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const json = decodeURIComponent(escape(atob(b64)));
  const o = JSON.parse(json) as { token?: string; name?: string };

  if (!o?.token || typeof o.token !== "string") {
    throw new Error("Invalid curriculum handoff payload");
  }

  return { token: o.token, name: String(o.name || "") };
}

export async function uploadCurriculumFile(file: File, token: string) {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(
    "https://api-pro.rydlearning.com/teacher/curriculum/upload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    },
  );

  if (response.ok) return;

  let message = "Could not validate your curriculum upload.";
  try {
    const data = (await response.json()) as { message?: unknown; error?: unknown };
    const apiMessage = data.message ?? data.error;
    if (typeof apiMessage === "string" && apiMessage.trim()) {
      message = apiMessage;
    }
  } catch {
    // Some API errors may not return JSON.
  }

  throw new Error(message);
}
