import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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

  return (
    <div className="p-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Inspections</h1>
        <div className="flex gap-2">
          <a
            href={exportInspectionsUrl(params.kind)}
            download
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Export CSV
          </a>
          <button
            onClick={() => setImportOpen(true)}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Import PACP…
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-400"
          >
            New inspection
          </button>
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
        <label className="block">
          <span className="text-xs text-slate-300">Asset UID</span>
          <input
            defaultValue={search.get("asset_uid") ?? ""}
            onBlur={(e) => setParam("asset_uid", e.target.value || null)}
            placeholder="HYD-00001"
            className="mt-1 rounded border border-slate-700 px-2 py-1 text-sm w-40"
          />
        </label>
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

      <div className="rounded-lg border border-slate-800 bg-slate-900">
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
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  No inspections match these filters.
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
                <td className="px-3 py-2 font-mono text-xs">{i.asset_uid ?? "—"}</td>
                <td className="px-3 py-2">{i.performed_at.slice(0, 16).replace("T", " ")}</td>
                <td className="px-3 py-2">{i.overall_condition ?? "—"}</td>
                <td className="px-3 py-2">
                  {i.pass === null ? (
                    <span className="text-slate-500">—</span>
                  ) : i.pass ? (
                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-200 ring-1 ring-emerald-500/30">
                      Pass
                    </span>
                  ) : (
                    <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase text-red-200 ring-1 ring-red-500/40">
                      Fail
                    </span>
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
