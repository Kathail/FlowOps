/**
 * Tiny utilities shared across the dashboard subcomponents.
 * Kept here (not in lib/) because they're dashboard-specific —
 * other features format dates differently or use full entity links.
 */

/** Human-readable elapsed time, terse — "2m ago", "5h ago", "3d ago". */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/** Format a numeric hour value as "32m", "4.2h", or "2d 3h". */
export function fmtHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  const d = Math.floor(h / 24);
  const rem = Math.round(h - d * 24);
  return rem === 0 ? `${d}d` : `${d}d ${rem}h`;
}

/** Map a backend entity_type string to a short display label and route. */
export function entityMeta(
  slug: string,
  t: string,
): { label: string; href: string; tone: "wo" | "sr" | "ins" } {
  switch (t) {
    case "work_order":
    case "WorkOrder":
      return { label: "WO", href: `/${slug}/work-orders`, tone: "wo" };
    case "service_request":
    case "ServiceRequest":
      return { label: "SR", href: `/${slug}/service-requests`, tone: "sr" };
    case "inspection":
    case "Inspection":
      return { label: "INS", href: `/${slug}/inspections`, tone: "ins" };
    default:
      return { label: t, href: `/${slug}/`, tone: "wo" };
  }
}

/**
 * Strip the legacy "[sim] " prefix from synthetic-data activity messages
 * so demo content reads like real activity. Defensive — also handles
 * absent prefix without changing the string. Once `simulate-year` is
 * updated to write user-clean copy, this becomes a no-op and can be
 * removed.
 */
export function cleanActivitySummary(s: string): string {
  return s.replace(/^\[sim\]\s*/i, "");
}
