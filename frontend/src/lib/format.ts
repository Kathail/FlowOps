/**
 * Cross-app formatting helpers. The rule: every user-visible date/time
 * in the app should go through one of these so we have a single place
 * to change format, locale, or timezone behaviour.
 *
 * Defaults to the user's browser locale + timezone; the underlying
 * data is always ISO-8601 from the API.
 */

const DT_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

/** "06 May 2026, 14:30" — ISO timestamp → locale date+time. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return DT_FORMAT.format(d);
}

/** "06 May 2026" — ISO date or timestamp → locale date only. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return DATE_FORMAT.format(d);
}

/** "5 minutes ago" / "in 2 hours" — short relative time. */
const RTF = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

const DIVISIONS: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Infinity, unit: "year" },
];

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  let duration = (d.getTime() - Date.now()) / 1000;
  for (const div of DIVISIONS) {
    if (Math.abs(duration) < div.amount) {
      return RTF.format(Math.round(duration), div.unit);
    }
    duration /= div.amount;
  }
  return "";
}
