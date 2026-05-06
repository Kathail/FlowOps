import { Link, useParams } from "react-router-dom";
import { useReportCatalog } from "./hooks";

export function ReportsPage() {
  const { slug } = useParams<{ slug: string }>();
  const query = useReportCatalog();

  return (
    <div className="p-8 space-y-4">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">Reports</h1>
        <p className="text-sm text-slate-400">
          Canned reports across assets, work orders, and inspections.
        </p>
      </header>

      {query.isLoading && <div className="text-slate-400">Loading…</div>}
      {query.isError && (
        <div className="text-red-400">Failed to load report catalog.</div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {query.data?.map((report) => (
          <Link
            key={report.slug}
            to={`/${slug}/reports/${report.slug}`}
            className="block rounded border border-slate-800 bg-slate-900 p-4 hover:border-slate-400 hover:shadow-sm"
          >
            <h2 className="text-lg font-medium text-slate-100">{report.title}</h2>
            <p className="mt-1 text-sm text-slate-300">{report.description}</p>
            {report.filters.length > 0 && (
              <p className="mt-2 text-xs uppercase text-slate-400">
                Filters:{" "}
                {report.filters.map((f) => f.name).join(", ")}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
