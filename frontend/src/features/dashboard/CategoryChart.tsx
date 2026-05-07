import type { DashboardResponse } from "./api";

/**
 * Horizontal bar chart of WO categories over the last 30 days.
 * Cosmetic-only update from the previous version: tighter type,
 * percentage on hover via title, capitalised category labels.
 */

export function CategoryChart({ buckets }: { buckets: DashboardResponse["wo_by_category_30d"] }) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const max = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">
          Work by category
        </h2>
        <p className="text-xs text-slate-500 tabular-nums">30d · {total}</p>
      </header>

      {buckets.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No work logged in the last 30 days.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {buckets.map((b) => {
            const pct = total === 0 ? 0 : (b.count / total) * 100;
            return (
              <li key={b.category} className="text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="capitalize text-[13px] text-slate-200">
                    {b.category.replace(/_/g, " ")}
                  </span>
                  <span
                    className="tabular-nums text-[11px] text-slate-400"
                    title={`${pct.toFixed(0)}% of work`}
                  >
                    {b.count}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500/60"
                    style={{ width: `${(b.count / max) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
