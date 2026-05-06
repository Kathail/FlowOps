import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/Button";
import { Dash } from "../../components/Dash";
import { EmptyState } from "../../components/States";
import { StatusPill } from "../../components/StatusPill";
import { formatDateTime } from "../../lib/format";
import { CreateInspectionDialog } from "./CreateInspectionDialog";
import { ImportPacpDialog } from "./ImportPacpDialog";
import { exportInspectionsUrl, type InspectionKind, type InspectionListParams } from "./api";
import { useInspections } from "./hooks";

const KINDS: { value: InspectionKind; label: string }[] = [
  { value: "hydrant_flow", label: "Hydrant flow" },
  { value: "valve_exercise", label: "Valve exercise" },
  { value: "manhole", label: "Manhole" },
  { value: "catch_basin", label: "Catch basin" },
  { value: "lift_station_round", label: "Lift station" },
  { value: "cctv", label: "CCTV" },
];

export function InspectionListPage() {
  const [search, setSearch] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const params: InspectionListParams = {
    kind: (search.get("kind") as InspectionKind) || undefined,
    asset_uid: search.get("asset_uid") || undefined,
    pass: (search.get("pass") as "true" | "false") || undefined,
    q: search.get("q") || undefined,
    page: Number(search.get("page") ?? 1),
    page_size: 50,
  };

  const insQuery = useInspections(params);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(search);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setSearch(next);
  }

  function clearFilters() {
    setSearch(new URLSearchParams());
  }

  const hasFilters = !!(params.kind || params.asset_uid || params.pass || params.q);

  return (
    <div className="p-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Inspections</h1>
        <div className="flex gap-2">
          <a href={exportInspectionsUrl(params.kind)} download className="btn-ghost">
            Export CSV
          </a>
          <Button variant="ghost" onClick={() => setImportOpen(true)}>
            Import PACP…
          </Button>
          <Button onClick={() => setCreateOpen(true)}>New inspection</Button>
        </div>
      </header>

      {createOpen && <CreateInspectionDialog onClose={() => setCreateOpen(false)} />}
      {importOpen && <ImportPacpDialog onClose={() => setImportOpen(false)} />}

      <div className="flex gap-3 items-end flex-wrap">
        <label className="block">
          <span className="text-xs text-slate-300">Kind</span>
          <select
            value={params.kind ?? ""}
            onChange={(e) => setParam("kind", e.target.value || null)}
            className="mt-1 rounded border border-slate-700 px-2 py-1 text-sm bg-slate-900"
          >
            <option value="">All kinds</option>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("asset_uid") as HTMLInputElement;
            setParam("asset_uid", input.value || null);
          }}
          className="block"
        >
          <label className="block">
            <span className="text-xs text-slate-300">Asset UID</span>
            <input
              name="asset_uid"
              defaultValue={search.get("asset_uid") ?? ""}
              onBlur={(e) => setParam("asset_uid", e.target.value || null)}
              placeholder="HYD-00001"
              className="mt-1 rounded border border-slate-700 px-2 py-1 text-sm w-40"
            />
          </label>
        </form>
        <label className="block">
          <span className="text-xs text-slate-300">Pass</span>
          <select
            value={params.pass ?? ""}
            onChange={(e) => setParam("pass", e.target.value || null)}
            className="mt-1 rounded border border-slate-700 px-2 py-1 text-sm bg-slate-900"
          >
            <option value="">Any</option>
            <option value="true">Pass</option>
            <option value="false">Fail</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Number</th>
              <th className="px-3 py-2 text-left">Kind</th>
              <th className="px-3 py-2 text-left">Asset</th>
              <th className="px-3 py-2 text-left">Performed</th>
              <th className="px-3 py-2 text-left">Condition</th>
              <th className="px-3 py-2 text-left">Pass</th>
            </tr>
          </thead>
          <tbody>
            {insQuery.isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {insQuery.data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    title={
                      hasFilters ? "No inspections match these filters." : "No inspections yet."
                    }
                    hint={
                      hasFilters
                        ? "Try widening the filters or clearing them."
                        : "Log a new inspection or import PACP results."
                    }
                    action={
                      hasFilters ? (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setCreateOpen(true)}>
                          New inspection
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            )}
            {insQuery.data?.items.map((i) => (
              <tr key={i.inspection_number} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs">
                  <Link to={`./${i.inspection_number}`} className="text-slate-100 hover:underline">
                    {i.inspection_number}
                  </Link>
                </td>
                <td className="px-3 py-2">{i.kind}</td>
                <td className="px-3 py-2 font-mono text-xs">{i.asset_uid ?? <Dash />}</td>
                <td className="px-3 py-2">{formatDateTime(i.performed_at)}</td>
                <td className="px-3 py-2">{i.overall_condition ?? <Dash />}</td>
                <td className="px-3 py-2">
                  {i.pass === null ? (
                    <Dash />
                  ) : i.pass ? (
                    <StatusPill tone="success" dot>
                      Pass
                    </StatusPill>
                  ) : (
                    <StatusPill tone="danger" dot>
                      Fail
                    </StatusPill>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
