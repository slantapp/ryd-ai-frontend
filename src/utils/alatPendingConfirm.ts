const PENDING_ALAT_CONFIRM_KEY = "ryd.ai.alat.pendingConfirm";

export type PendingAlatConfirm = {
  transactionId: string;
  planKey: string;
  savedAt: number;
};

export function savePendingAlatConfirm(payload: {
  transactionId: string;
  planKey: string;
}): void {
  if (typeof window === "undefined") return;
  const row: PendingAlatConfirm = {
    transactionId: String(payload.transactionId).trim(),
    planKey: String(payload.planKey).trim(),
    savedAt: Date.now(),
  };
  if (!row.transactionId || !row.planKey) return;
  try {
    window.localStorage.setItem(PENDING_ALAT_CONFIRM_KEY, JSON.stringify(row));
  } catch {
    // ignore quota / private mode
  }
}

export function readPendingAlatConfirm(): PendingAlatConfirm | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PENDING_ALAT_CONFIRM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAlatConfirm;
    if (!parsed?.transactionId || !parsed?.planKey) return null;
    // Ignore stale rows older than 7 days.
    if (Date.now() - Number(parsed.savedAt || 0) > 7 * 24 * 60 * 60 * 1000) {
      clearPendingAlatConfirm();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingAlatConfirm(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PENDING_ALAT_CONFIRM_KEY);
  } catch {
    // ignore
  }
}

export function extractAlatClientTxnId(response: {
  status?: boolean | string;
  transactionStatus?: string;
  id?: string;
  Id?: string;
  transactionId?: string;
  data?: { id?: string; Id?: string; status?: string };
}): string {
  return String(
    response?.data?.id ||
      response?.data?.Id ||
      response?.id ||
      response?.Id ||
      response?.transactionId ||
      "",
  ).trim();
}

/** ALAT callback shapes vary; treat presence of a completed txn id as success. */
export function isAlatClientPaymentCompleted(response: {
  status?: boolean | string;
  transactionStatus?: string;
  id?: string;
  Id?: string;
  transactionId?: string;
  data?: { id?: string; Id?: string; status?: string };
}): boolean {
  const id = extractAlatClientTxnId(response);
  if (!id) return false;
  if (response.status === true) return true;
  const status = String(response.status || "").trim().toLowerCase();
  if (["completed", "successful", "success", "paid", "approved", "true"].includes(status)) {
    return true;
  }
  const txStatus = String(
    response.transactionStatus || response.data?.status || "",
  )
    .trim()
    .toLowerCase();
  return ["completed", "successful", "success", "paid", "approved"].includes(
    txStatus,
  );
}
