import { toast } from "react-toastify";

export interface LoginPayload {
  parentToken?: string;
  adminToken?: string;
  parentId: string | number;
  timestamp: number;
}

export interface LoginCodeResult {
  decoded: LoginPayload | null;
  status: boolean;
}

function fromBase64Url(base64: string): string {
  const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function validateLoginCode(code: string): LoginCodeResult {
  if (!code) {
    toast.error("Code is required");
    return { decoded: null, status: false };
  }

  let decoded: LoginPayload | null = null;
  let status = true;

  try {
    const jsonStr = fromBase64Url(code);
    decoded = JSON.parse(jsonStr) as LoginPayload;
  } catch {
    status = false;
  }

  if (!decoded) {
    return { decoded: null, status: false };
  }

  const { parentId, timestamp } = decoded;

  const hasValidAdminToken =
    typeof decoded.adminToken === "string" && decoded.adminToken.trim().length > 0;
  const hasValidParentToken =
    typeof decoded.parentToken === "string" && decoded.parentToken.trim().length > 0;

  if (!hasValidAdminToken && !hasValidParentToken) {
    status = false;
  }

  if (!parentId || typeof timestamp !== "number") {
    status = false;
  }

  // 3 min (180000 ms) expiration
  if (status && Date.now() - timestamp > 180_000) {
    status = false;
  }

  return { decoded, status };
}
