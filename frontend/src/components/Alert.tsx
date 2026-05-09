import type { ReactNode } from "react";

/**
 * Inline alert / banner with four variants (error, success, info,
 * warning). Replaces the half-dozen hand-rolled red / amber / blue
 * divs scattered across the app.
 *
 * Accessibility: `error` and `warning` default to `role="alert"` so
 * assistive tech announces them immediately; `success` and `info`
 * default to `role="status"` (polite announcement). Pass `role`
 * explicitly to override.
 */

export type AlertVariant = "error" | "success" | "info" | "warning";

// Operations-console palette: muted backgrounds, hairline borders, no
// chunky chrome. Rose for error (warmer than red, matches emergency
// markers), signal-cyan for info (the primary accent).
const VARIANT: Record<AlertVariant, string> = {
  error: "border-rose-500/30 bg-rose-500/5 text-rose-200",
  success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
  info: "border-signal/30 bg-signal/5 text-signal",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-200",
};

const ASSERTIVE: ReadonlySet<AlertVariant> = new Set(["error", "warning"]);

export function Alert({
  variant = "error",
  children,
  className = "",
  role,
}: {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
  role?: string;
}) {
  return (
    <div
      role={role ?? (ASSERTIVE.has(variant) ? "alert" : "status")}
      className={`rounded-md border px-3 py-2 text-sm ${VARIANT[variant]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
