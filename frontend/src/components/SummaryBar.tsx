import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Row of summary stats sitting at the top of a list page. Each stat
 * is optionally a link (so clicking the count filters the table to
 * that subset). Designed to be terse — single-line value + label,
 * no decoration. Drop into list pages above the filter row.
 *
 *   <SummaryBar>
 *     <SummaryBar.Stat label="Open" value={42} to="?status=open" />
 *     <SummaryBar.Stat label="Overdue" value={6} tone="danger" to="?overdue=1" />
 *     <SummaryBar.Stat label="Done today" value={3} tone="success" />
 *   </SummaryBar>
 */

const TONE: Record<string, string> = {
  default: "text-slate-100",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-red-300",
  muted: "text-slate-400",
};

function Root({ children }: { children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label="Summary"
      className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border border-slate-800 bg-slate-900 px-4 py-3"
    >
      {children}
    </div>
  );
}

interface StatProps {
  label: string;
  value: string | number;
  to?: string;
  tone?: keyof typeof TONE;
  /** Tiny secondary line below the value — e.g. "of 32 active". */
  sub?: string;
  /** Visual indication that this stat matches the page's current view —
   * e.g. when scope=active the "Active" stat renders with a blue ring
   * so the operator doesn't second-guess what filter is applied. */
  active?: boolean;
}

function Stat({ label, value, to, tone = "default", sub, active = false }: StatProps) {
  const cls = TONE[tone] ?? TONE.default;
  const ring = active ? "ring-1 ring-blue-500/40 bg-blue-500/5" : "";
  const inner = (
    <>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-lg font-semibold tabular-nums leading-tight ${cls}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </>
  );
  if (to) {
    return (
      <Link
        to={to}
        className={`block rounded px-1 -mx-1 transition-colors hover:bg-slate-800/50 ${ring}`}
      >
        {inner}
      </Link>
    );
  }
  return <div className={ring ? `rounded ${ring} px-1 -mx-1` : ""}>{inner}</div>;
}

export const SummaryBar = Object.assign(Root, { Stat });
