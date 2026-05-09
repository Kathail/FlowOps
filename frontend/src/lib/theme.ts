/**
 * Operations-console theme tokens shared across features.
 *
 * Pure data + pure functions only — no React. Anywhere a domain or
 * priority maps to a colour, this is the source of truth, so a tone
 * tweak in one place (rose → ruby, etc.) propagates without grepping
 * 30 files for "fb7185".
 *
 * The dot/text/bg classes return *Tailwind class strings* rather than
 * hex values so the JIT can pick them up at build time. Don't compute
 * class names by string interpolation in callers — pass through the
 * helpers below.
 */

export type Tone = "signal" | "warn" | "danger" | "neutral";

/** Hex values — only used by SVG / inline-style call sites where a
 * Tailwind class won't work (gauges, MapLibre paint). React components
 * should prefer the class helpers below. */
export const TONE_HEX: Record<Tone, string> = {
  signal: "#67e8f9", // cyan-300, also tailwind.config theme.signal
  warn: "#f59e0b", // amber-500
  danger: "#fb7185", // rose-400
  neutral: "#94a3b8", // slate-400
};

/** Foreground text class for a tone. */
export const TONE_TEXT: Record<Tone, string> = {
  signal: "text-signal",
  warn: "text-amber-200",
  danger: "text-rose-200",
  neutral: "text-slate-100",
};

/** Background dot/chip class for a tone. */
export const TONE_DOT: Record<Tone, string> = {
  signal: "bg-signal",
  warn: "bg-amber-400",
  danger: "bg-rose-400",
  neutral: "bg-slate-500",
};

/** Domain colours for service-area chips, layer dots, etc. Same key
 * set the backend uses (`maintenance` / `water_system` / `sewer_system`
 * / `storm_system`). */
export const DOMAIN_DOT: Record<string, string> = {
  maintenance: "bg-amber-400",
  water_system: "bg-cyan-400",
  sewer_system: "bg-emerald-400",
  storm_system: "bg-violet-400",
};

export const DOMAIN_LABEL_SHORT: Record<string, string> = {
  maintenance: "Maint",
  water_system: "Water",
  sewer_system: "Sewer",
  storm_system: "Storm",
};

/** Priority order — used by SR/WO ranking and the colour ramp below. */
export const PRIORITY_ORDER = ["emergency", "high", "normal", "low", "other"] as const;
export type Priority = (typeof PRIORITY_ORDER)[number];

export const PRIORITY_BG: Record<string, string> = {
  emergency: "bg-rose-500",
  high: "bg-amber-500",
  normal: "bg-signal",
  low: "bg-slate-500",
  other: "bg-slate-700",
};

export const PRIORITY_TEXT: Record<string, string> = {
  emergency: "text-rose-300",
  high: "text-amber-300",
  normal: "text-signal",
  low: "text-slate-400",
  other: "text-slate-500",
};

/** Tone for a numeric KPI threshold (completion-rate-style metrics). */
export function tonForRatio(rate: number | null): Tone {
  if (rate === null) return "neutral";
  if (rate >= 1.0) return "signal";
  if (rate >= 0.8) return "neutral";
  if (rate >= 0.5) return "warn";
  return "danger";
}

/** Tone-classed helper — picks the right text colour for a tone. */
export function toneText(tone: Tone): string {
  return TONE_TEXT[tone];
}
