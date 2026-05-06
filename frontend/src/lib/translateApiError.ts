import { ApiError } from "./apiClient";

/**
 * Convert a backend error to user-facing copy. The API surfaces
 * machine-readable codes (`bad_credentials`, `slug_taken`, etc.); this
 * is the single place that maps them to phrases a dispatcher would
 * understand. Unknown codes fall back to the API message; non-API
 * errors fall back to a generic "try again" message so we never leak
 * a stack trace into the UI.
 */

const MESSAGES: Record<string, string> = {
  bad_credentials: "Invalid tenant, email, or password.",
  slug_taken: "That slug is already taken.",
  email_taken: "An account with that email already exists.",
  not_found: "Not found.",
  forbidden: "You don't have permission to do that.",
  unauthorized: "Your session expired. Sign in again.",
  conflict:
    "Someone else updated this since you loaded it. Reload to see the latest, then try again.",
  validation_error: "Some fields need attention. Check the form and try again.",
  rate_limited: "Too many requests. Wait a moment and try again.",
};

const GENERIC = "Something went wrong. Try again — if it keeps happening, contact support.";

export function translateApiError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code && MESSAGES[err.code]) return MESSAGES[err.code];
    // Surface the API's prose message when present and non-empty —
    // backend explicitly chose those strings for the human path.
    if (err.message) return err.message;
    return GENERIC;
  }
  return GENERIC;
}
