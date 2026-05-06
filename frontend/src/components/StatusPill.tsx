import type { ReactNode } from "react";

/**
 * Small inline pill for status / priority / pass-fail / etc. Replaces
 * the half-dozen places that hand-rolled
 * `rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] ring-1 …`.
 *
 * `tone` selects the color family; `children` is the text. Defaults
 * to `neutral` (slate). Pick by *meaning*, not color: e.g. a
 * "completed" status is `success`, "in_progress" is `info`,
 * "cancelled" is `neutral`, "high priority" is `warning`.
 */

export type PillTone = "neutral" | "info" | "success" | "warning" | "danger" | "muted";

const TONE: Record<PillTone, string> = {
  neutral: "bg-slate-500/15 text-slate-200 ring-slate-500/30",
  info: "bg-blue-500/15 text-blue-200 ring-blue-500/30",
  success: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-200 ring-amber-500/40",
  danger: "bg-red-500/15 text-red-200 ring-red-500/40",
  muted: "bg-slate-700/30 text-slate-400 ring-slate-700/50",
};

interface Props {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
  /** Leading dot in the pill — useful when the pill encodes a status
   *  (visual cue beyond color, helps colorblind users). */
  dot?: boolean;
}

export function StatusPill({ tone = "neutral", children, className = "", dot = false }: Props) {
  const classes =
    `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${TONE[tone]} ${className}`.trim();
  return (
    <span className={classes}>
      {dot && <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
