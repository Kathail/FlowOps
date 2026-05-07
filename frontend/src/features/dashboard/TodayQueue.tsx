import { Link } from "react-router-dom";
import { StatusPill, type PillTone } from "../../components/StatusPill";
import type { DashboardResponse } from "./api";

/**
 * Supervisor's "your queue" — the WOs assigned to them due today,
 * with a tiny progress bar for daily routes (asset_done/asset_total).
 * Each item links to the WO detail.
 */

const PRIORITY_TONE: Record<string, PillTone> = {
  emergency: "danger",
  high: "warning",
  normal: "neutral",
  low: "muted",
};

export function TodayQueue({
  items,
  slug,
}: {
  items: DashboardResponse["today_queue"];
  slug: string;
}) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">Your queue</h2>
        <Link
          to={`/${slug}/work-orders?assigned_to=me`}
          className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
        >
          See all →
        </Link>
      </header>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No work assigned to you today.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((q) => {
            const pct = q.asset_total === 0 ? 0 : Math.round((q.asset_done / q.asset_total) * 100);
            return (
              <li key={q.wo_number}>
                <Link
                  to={`/${slug}/work-orders/${q.wo_number}`}
                  className="block rounded border border-slate-800 bg-slate-950/40 p-2.5 transition-colors hover:border-blue-500/50 hover:bg-slate-900/80"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm text-slate-100">
                      <span className="font-mono text-[11px] text-slate-500 mr-2">
                        {q.wo_number}
                      </span>
                      {q.title}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      {q.is_overdue && (
                        <StatusPill tone="danger" dot>
                          Overdue
                        </StatusPill>
                      )}
                      <StatusPill tone={PRIORITY_TONE[q.priority] ?? "neutral"}>
                        {q.priority}
                      </StatusPill>
                    </div>
                  </div>
                  {q.asset_total > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500/70 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-[10px] text-slate-400">
                        {q.asset_done}/{q.asset_total}
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
