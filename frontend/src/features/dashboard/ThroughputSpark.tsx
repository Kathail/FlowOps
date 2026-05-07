import type { DashboardResponse } from "./api";

/**
 * 7-day completed-work sparkline. Sits in the dashboard sidebar
 * as a low-noise rhythm indicator — were we shipping work? Is
 * today an outlier?
 */

export function ThroughputSpark({
  series,
  totalThisWeek,
}: {
  series: DashboardResponse["throughput_7d"];
  totalThisWeek: number;
}) {
  const max = Math.max(1, ...series.map((d) => d.completed));
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">
          7-day throughput
        </h2>
        <p className="text-lg font-semibold tabular-nums text-emerald-300">{totalThisWeek}</p>
      </header>
      <div
        className="mt-3 flex h-12 items-end gap-1"
        role="img"
        aria-label="Daily completed work for the past 7 days"
      >
        {series.map((d) => {
          const h = Math.max(2, (d.completed / max) * 100);
          const dayLabel = new Date(d.date).toLocaleDateString(undefined, { weekday: "short" });
          return (
            <div
              key={d.date}
              className="flex flex-1 flex-col items-center justify-end gap-1"
              title={`${dayLabel}: ${d.completed} completed`}
            >
              <div
                className="w-full rounded-t bg-emerald-500/40 hover:bg-emerald-500/70"
                style={{ height: `${h}%` }}
              />
              <span className="text-[9px] uppercase text-slate-500">{dayLabel.slice(0, 1)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
