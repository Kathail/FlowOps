import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/Button";
import { Dash } from "../../components/Dash";
import { EmptyState } from "../../components/States";
import { StatusPill, type PillTone } from "../../components/StatusPill";
import { formatDateTime } from "../../lib/format";
import { IntakeDialog } from "./IntakeDialog";
import type { ServiceRequestListParams, SrCategory, SrDomain, SrStatus } from "./api";
import { useServiceRequests } from "./hooks";

const STATUSES: SrStatus[] = ["new", "triaged", "dispatched", "closed", "duplicate"];
const DOMAINS: SrDomain[] = ["water", "sewer", "storm"];
const CATEGORIES: SrCategory[] = [
  "low_pressure",
  "no_water",
  "sewer_backup",
  "flooding",
  "odour",
  "damaged_asset",
  "discoloured_water",
  "water_quality",
  "other",
];

const STATUS_TONE: Record<SrStatus, PillTone> = {
  new: "info",
  triaged: "warning",
  dispatched: "info",
  closed: "muted",
  duplicate: "muted",
};

export function ServiceRequestListPage() {
  const { slug } = useParams<{ slug: string }>();
  const [search, setSearch] = useSearchParams();
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [pendingQ, setPendingQ] = useState(search.get("q") ?? "");

  const params: ServiceRequestListParams = {
    status: (search.get("status") as SrStatus) || undefined,
    category: (search.get("category") as SrCategory) || undefined,
    domain: (search.get("domain") as SrDomain) || undefined,
    q: search.get("q") || undefined,
    page: Number(search.get("page") ?? 1),
    page_size: 50,
  };

  const query = useServiceRequests(params);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(search);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setSearch(next);
  }

  function clearFilters() {
    setSearch(new URLSearchParams());
    setPendingQ("");
  }

  const hasFilters = !!(params.status || params.category || params.domain || params.q);

  return (
    <div className="p-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Service requests</h1>
        <Button onClick={() => setIntakeOpen(true)}>New intake</Button>
      </header>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label>
          <span className="block text-slate-300">Status</span>
          <select
            value={params.status ?? ""}
            onChange={(e) => setParam("status", e.target.value || null)}
            className="mt-1 rounded border border-slate-700 px-2 py-1"
          >
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-slate-300">Domain</span>
          <select
            value={params.domain ?? ""}
            onChange={(e) => setParam("domain", e.target.value || null)}
            className="mt-1 rounded border border-slate-700 px-2 py-1"
          >
            <option value="">Any</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-slate-300">Category</span>
          <select
            value={params.category ?? ""}
            onChange={(e) => setParam("category", e.target.value || null)}
            className="mt-1 rounded border border-slate-700 px-2 py-1"
          >
            <option value="">Any</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", pendingQ || null);
          }}
          className="flex-1 max-w-xs"
        >
          <label>
            <span className="block text-slate-300">Search</span>
            <input
              value={pendingQ}
              onChange={(e) => setPendingQ(e.target.value)}
              onBlur={() => setParam("q", pendingQ || null)}
              placeholder="number, caller, address, description"
              className="mt-1 w-full rounded border border-slate-700 px-2 py-1"
            />
          </label>
        </form>
      </div>

      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2">Number</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Caller</th>
              <th className="px-3 py-2">Address</th>
              <th className="px-3 py-2">Reported</th>
              <th className="px-3 py-2">WO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {query.data?.items.map((sr) => (
              <tr key={sr.sr_number} className="hover:bg-slate-800/50">
                <td className="px-3 py-2 font-medium">
                  <Link
                    to={`/${slug}/service-requests/${sr.sr_number}`}
                    className="text-slate-100 hover:underline"
                  >
                    {sr.sr_number}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <StatusPill tone={STATUS_TONE[sr.status]} dot>
                    {sr.status}
                  </StatusPill>
                </td>
                <td className="px-3 py-2">{sr.category}</td>
                <td className="px-3 py-2">{sr.domain}</td>
                <td className="px-3 py-2">{sr.priority}</td>
                <td className="px-3 py-2">{sr.caller_name ?? <Dash />}</td>
                <td className="px-3 py-2 max-w-xs truncate">{sr.reported_address ?? <Dash />}</td>
                <td className="px-3 py-2 text-slate-400">
                  {formatDateTime(sr.reported_at) || <Dash />}
                </td>
                <td className="px-3 py-2">
                  {sr.work_order_number ? (
                    <Link
                      to={`/${slug}/work-orders/${sr.work_order_number}`}
                      className="text-slate-200 hover:underline"
                    >
                      {sr.work_order_number}
                    </Link>
                  ) : (
                    <Dash />
                  )}
                </td>
              </tr>
            ))}
            {query.data && query.data.items.length === 0 && (
              <tr>
                <td colSpan={9} className="p-0">
                  <EmptyState
                    title={
                      hasFilters
                        ? "No service requests match these filters."
                        : "No service requests yet."
                    }
                    hint={
                      hasFilters
                        ? "Try widening the filters or clearing them."
                        : "Log a new intake to get started."
                    }
                    action={
                      hasFilters ? (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setIntakeOpen(true)}>
                          New intake
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {intakeOpen && <IntakeDialog onClose={() => setIntakeOpen(false)} />}
    </div>
  );
}
