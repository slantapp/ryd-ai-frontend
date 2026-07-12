/**
 * Detects register failures where the email is already registered.
 * API example (often HTTP 200 with body status:false):
 * { "message": "Email already used. Please login instead.", "status": false, "data": null }
 */
export function isEmailAlreadyRegisteredError(
  status: number | undefined,
  message: unknown,
): boolean {
  if (status === 409) return true;

  if (typeof message !== "string") return false;
  const text = message.toLowerCase();

  if (
    text.includes("email already used") ||
    text.includes("please login instead") ||
    text.includes("already used")
  ) {
    return true;
  }

  return /already.*(exist|register|use)|email.*(exist|taken|register|used)|exist.*email|duplicate.*email|user.*exist|account.*exist/i.test(
    message,
  );
}

/** Pull a human-readable message from Axios or plain Error (soft API failures). */
export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong",
): string {
  if (err && typeof err === "object" && "response" in err) {
    const data = (err as { response?: { data?: { message?: unknown } } })
      .response?.data;
    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}
