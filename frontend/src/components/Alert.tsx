import type { ReactNode } from "react";

/**
 * Inline alert / banner with three variants. Replaces the half-dozen
 * hand-rolled red / amber / blue divs scattered across the app.
 */

export type AlertVariant = "error" | "success" | "info" | "warning";

const VARIANT: Record<AlertVariant, string> = {
  error: "border-red-500/40 bg-red-500/10 text-red-200",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  info: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
};

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
      role={role ?? (variant === "error" ? "alert" : "status")}
      className={`rounded-md border px-3 py-2 text-sm ${VARIANT[variant]} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
