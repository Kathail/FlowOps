import { Link } from "react-router-dom";
import type { DashboardResponse } from "./api";

/**
 * Hero KPIs — the three numbers a supervisor checks first thing in the
 * morning: Open work, Overdue, and New service requests.
 *
 * Cognitive-load decision: previous version surfaced 7 KPIs side-by-side
 * with equal weight. We collapse to 3 large clickable tiles + a
 * secondary line of context numbers, so the eye lands on what matters
 * before scanning everything else.
 *
 * Each tile is an anchor — clicking the number filters the relevant
 * list page so the dashboard reads as a launchpad, not a static report.
 */

interface Props {
  data: DashboardResponse;
  slug: string;
}

export function KpiHero({ data, slug }: Props) {
  const wo = data.wo_kpis;
  const sr = data.sr_kpis;
  const completion = wo.completion_rate_30d;
  const completionLabel = completion === null ? "—" : `${Math.round(completion * 100)}%`;
  return (
    <section aria-label="Today at a glance" className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiTile
          to={`/${slug}/work-orders?status=open`}
          label="Open work orders"
          value={wo.open}
          sub={`${wo.in_progress} in progress`}
          tone="blue"
        />
        <KpiTile
          to={`/${slug}/work-orders?overdue=1`}
          label="Overdue"
          value={wo.overdue}
          sub={wo.stale_open ? `${wo.stale_open} stale 30d+` : "on time"}
          tone={wo.overdue > 0 ? "red" : "neutral"}
        />
        <KpiTile
          to={`/${slug}/service-requests?status=new`}
          label="New service requests"
          value={sr.new}
          sub={`${sr.triaged} triaged · ${sr.dispatched} dispatched`}
          tone={sr.new > 0 ? "amber" : "neutral"}
        />
      </div>

      {/* Secondary stats — single dense row, smaller, no longer compete
          for attention but still glanceable in the same eyeline. */}
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-400">
        <Stat label="Completion 30d" value={completionLabel} />
        <Stat label="Avg close" value={fmtHours(wo.avg_close_hours_30d)} />
        <Stat label="Done this week" value={String(wo.completed_this_week)} />
        <Stat label="Hours logged this week" value={`${wo.hours_this_week.toFixed(1)}h`} />
      </dl>
    </section>
  );
}

function KpiTile({
  to,
  label,
  value,
  sub,
  tone,
}: {
  to: string;
  label: string;
  value: number;
  sub?: string;
  tone: "blue" | "red" | "amber" | "neutral";
}) {
  const accent = TONE[tone];
  return (
    <Link
      to={to}
      className={`block rounded-md border ${accent.border} ${accent.bg} p-4 transition-colors hover:border-blue-500/60`}
      aria-label={`${value} ${label}${sub ? ", " + sub : ""}`}
    >
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${accent.text}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="uppercase tracking-wider text-[10px]">{label}</span>
      <span className="text-slate-200 tabular-nums">{value}</span>
    </span>
  );
}

function fmtHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

const TONE: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: "bg-blue-500/10", text: "text-blue-200", border: "border-blue-500/30" },
  red: { bg: "bg-red-500/10", text: "text-red-200", border: "border-red-500/40" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-200", border: "border-amber-500/30" },
  neutral: { bg: "bg-slate-900", text: "text-slate-200", border: "border-slate-800" },
};
