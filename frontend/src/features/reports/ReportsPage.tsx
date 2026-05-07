import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../../components/States";
import { downloadUrl } from "./api";
import type { ReportCatalogEntry } from "./api";
import { useReportCatalog } from "./hooks";

/**
 * Reports hub. Groups the catalog by topic so the page reads as a
 * library — Asset, Operations, Inspections — instead of a flat list
 * of five cards. Each card carries an icon, an honest description of
 * what the report answers, and direct download links so a supervisor
 * doesn't have to drill in just to grab the CSV.
 *
 * Grouping is derived from the report `slug` — no backend change.
 */

interface Group {
  id: string;
  label: string;
  description: string;
  iconKey: ReportIconKey;
  matchSlugs: string[];
}

const GROUPS: Group[] = [
  {
    id: "assets",
    label: "Asset reports",
    description: "Inventory health, age, and risk profile.",
    iconKey: "asset",
    matchSlugs: ["age-distribution", "condition-criticality"],
  },
  {
    id: "operations",
    label: "Operations",
    description: "What the crews have been working on, and how fast.",
    iconKey: "ops",
    matchSlugs: ["wo-summary", "break-history"],
  },
  {
    id: "inspections",
    label: "Inspections",
    description: "Pass / fail trends across asset classes and time.",
    iconKey: "ins",
    matchSlugs: ["inspection-summary"],
  },
];

const FALLBACK_GROUP: Group = {
  id: "other",
  label: "Other reports",
  description: "Reports that don't fit one of the above categories.",
  iconKey: "ops",
  matchSlugs: [],
};

export function ReportsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [filter, setFilter] = useState("");
  const query = useReportCatalog();

  const grouped = useMemo(() => {
    if (!query.data) return [];
    const reports = query.data.filter(
      (r) =>
        !filter ||
        r.title.toLowerCase().includes(filter.toLowerCase()) ||
        r.description.toLowerCase().includes(filter.toLowerCase()),
    );
    const byGroup = new Map<string, { group: Group; reports: ReportCatalogEntry[] }>();
    for (const r of reports) {
      const g = GROUPS.find((g) => g.matchSlugs.includes(r.slug)) ?? FALLBACK_GROUP;
      const bucket = byGroup.get(g.id) ?? { group: g, reports: [] };
      bucket.reports.push(r);
      byGroup.set(g.id, bucket);
    }
    return [...byGroup.values()];
  }, [query.data, filter]);

  return (
    <div className="p-8 space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Reports</h1>
          <p className="mt-1 text-sm text-slate-400">
            Canned reports across assets, work orders, and inspections. Run in-browser, or download
            as CSV / PDF.
          </p>
        </div>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter reports…"
          className="rounded border border-slate-700 px-3 py-1.5 text-sm bg-slate-900 w-64"
        />
      </header>

      {query.isLoading && <LoadingState />}
      {query.isError && (
        <ErrorState message="Failed to load report catalog." retry={() => query.refetch()} />
      )}

      {grouped.length === 0 && query.data && (
        <p className="text-sm text-slate-400">No reports match "{filter}".</p>
      )}

      {grouped.map(({ group, reports }) => (
        <section key={group.id} className="space-y-3">
          <header>
            <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">
              {group.label}
            </h2>
            <p className="text-xs text-slate-500">{group.description}</p>
          </header>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((r) => (
              <ReportCard key={r.slug} report={r} slug={slug ?? ""} iconKey={group.iconKey} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ReportCard({
  report,
  slug,
  iconKey,
}: {
  report: ReportCatalogEntry;
  slug: string;
  iconKey: ReportIconKey;
}) {
  return (
    <article className="flex flex-col rounded-md border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700">
      <header className="flex items-start gap-3">
        <ReportIcon kind={iconKey} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-slate-100">{report.title}</h3>
          <p className="mt-1 text-sm leading-snug text-slate-400">{report.description}</p>
        </div>
      </header>

      {report.filters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {report.filters.map((f) => (
            <span
              key={f.name}
              className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400"
              title={`Filter: ${f.type}`}
            >
              {f.name}
            </span>
          ))}
        </div>
      )}

      <footer className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3">
        <Link
          to={`/${slug}/reports/${report.slug}`}
          className="btn-primary"
          style={{ paddingTop: "0.4rem", paddingBottom: "0.4rem" }}
        >
          Run report
        </Link>
        <div className="flex gap-2 text-xs">
          <a
            href={downloadUrl(report.slug, "csv", {})}
            download
            className="text-slate-300 underline-offset-2 hover:text-slate-100 hover:underline"
          >
            CSV
          </a>
          <a
            href={downloadUrl(report.slug, "pdf", {})}
            download
            className="text-slate-300 underline-offset-2 hover:text-slate-100 hover:underline"
          >
            PDF
          </a>
        </div>
      </footer>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Tiny inline SVG icons — keeps the component self-contained, no asset deps.  */
/* -------------------------------------------------------------------------- */

type ReportIconKey = "asset" | "ops" | "ins";

function ReportIcon({ kind }: { kind: ReportIconKey }) {
  const props = {
    asset: { color: "text-blue-300", path: "M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4" },
    ops: { color: "text-amber-300", path: "M4 6h16M4 12h16M4 18h10" },
    ins: { color: "text-purple-300", path: "M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
  }[kind];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-800/60 ${props.color}`}
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d={props.path} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
