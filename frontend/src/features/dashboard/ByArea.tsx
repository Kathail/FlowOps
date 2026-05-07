import { Link } from "react-router-dom";
import type { DashboardResponse } from "./api";

/**
 * Service-area workload — grouped by domain (Maintenance, Water,
 * Wastewater, Storm) with a clear visual identity per group.
 *
 * Cognitive-load fix from the previous version: counts now read as
 * "5 open · 2 overdue · 3 SR" with consistent ordering and explicit
 * labels. Group headers carry a domain colour band so the eye
 * separates the four blocks even at a glance.
 *
 * Each row links into the map filtered by that area so the dashboard
 * stays operational — counts aren't decorative, they're entry points.
 */

const DOMAIN_META: Record<string, { label: string; band: string; mapKind: string | null }> = {
  maintenance: {
    label: "Maintenance districts",
    band: "border-l-amber-500/60",
    mapKind: "maintenance",
  },
  water_system: {
    label: "Water systems",
    band: "border-l-blue-500/60",
    mapKind: "water_system",
  },
  sewer_system: {
    label: "Wastewater systems",
    band: "border-l-emerald-500/60",
    mapKind: "sewer_system",
  },
  storm_system: {
    label: "Storm drainage",
    band: "border-l-purple-500/60",
    mapKind: "storm_system",
  },
};

const DOMAIN_ORDER = ["maintenance", "water_system", "sewer_system", "storm_system"];

export function ByArea({ rows, slug }: { rows: DashboardResponse["by_area"]; slug: string }) {
  if (rows.length === 0) {
    return (
      <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">
          Service areas
        </h2>
        <p className="mt-3 text-sm text-slate-500">
          No service areas configured yet.{" "}
          <Link to={`/${slug}/admin`} className="text-blue-400 hover:underline">
            Set up districts and systems →
          </Link>
        </p>
      </section>
    );
  }

  // Group + preserve a stable display order across reloads.
  const byKind: Record<string, DashboardResponse["by_area"]> = {};
  for (const r of rows) (byKind[r.kind] ??= []).push(r);
  const orderedKinds = DOMAIN_ORDER.filter((k) => byKind[k]?.length);

  return (
    <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">
          Service areas
        </h2>
        <Link
          to={`/${slug}/map`}
          className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
        >
          Open map →
        </Link>
      </header>

      <div className="mt-3 space-y-4">
        {orderedKinds.map((kind) => {
          const meta = DOMAIN_META[kind] ?? {
            label: kind,
            band: "border-l-slate-600",
            mapKind: null,
          };
          return (
            <div key={kind} className={`border-l-2 ${meta.band} pl-3`}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {meta.label}
              </p>
              <ul className="mt-1.5 divide-y divide-slate-800/70">
                {byKind[kind].map((a) => (
                  <li key={a.id} className="py-1.5">
                    <Link
                      to={`/${slug}/map`}
                      className="grid grid-cols-[1fr_auto] items-center gap-3 rounded px-1 py-1 hover:bg-slate-800/40"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: a.color ?? "#475569" }}
                          aria-hidden="true"
                        />
                        <span className="truncate text-sm text-slate-100">{a.name}</span>
                      </span>
                      <AreaCounts row={a} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Inline counts — fixed reading order: "open · overdue · SR".
 * Zero values render as muted placeholder so the layout is stable
 * but the eye skips past them.
 */
function AreaCounts({ row }: { row: DashboardResponse["by_area"][number] }) {
  return (
    <span className="flex items-baseline gap-3 text-xs">
      <Count value={row.active_wos} label="open" tone="info" />
      <Count value={row.overdue_wos} label="overdue" tone="danger" />
      <Count value={row.active_srs} label="SR" tone="warning" />
    </span>
  );
}

function Count({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "info" | "danger" | "warning";
}) {
  const cls =
    value === 0
      ? "text-slate-600"
      : tone === "danger"
        ? "text-red-300"
        : tone === "warning"
          ? "text-amber-300"
          : "text-blue-300";
  return (
    <span className="inline-flex items-baseline gap-1 tabular-nums">
      <span className={`text-sm font-semibold ${cls}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    </span>
  );
}
