import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/Button";
import { Dash } from "../../components/Dash";
import { EmptyState } from "../../components/States";
import { formatDate } from "../../lib/format";
import { ExportButton } from "./ExportButton";
import { ImportDialog } from "./ImportDialog";
import { useAssetClasses, useAssets } from "./hooks";
import type { AssetListParams } from "./api";

const STATUSES = ["active", "abandoned", "removed", "proposed"] as const;

export function AssetListPage() {
  const [search, setSearch] = useSearchParams();
  const [pendingQ, setPendingQ] = useState(search.get("q") ?? "");
  const [importOpen, setImportOpen] = useState(false);

  const params: AssetListParams = {
    class: search.get("class") ?? undefined,
    status: (search.get("status") as AssetListParams["status"]) ?? undefined,
    q: search.get("q") ?? undefined,
    page: Number(search.get("page") ?? 1),
    page_size: Number(search.get("page_size") ?? 50),
  };

  const classesQuery = useAssetClasses();
  const assetsQuery = useAssets(params);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(search);
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setSearch(next);
  }

  function clearFilters() {
    setSearch(new URLSearchParams());
    setPendingQ("");
  }

  const hasFilters = !!(params.class || params.status || params.q);

  return (
    <div className="p-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Assets</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setImportOpen(true)}>
            Import…
          </Button>
          <ExportButton />
        </div>
      </header>

      {importOpen && <ImportDialog onClose={() => setImportOpen(false)} />}

      <div className="flex gap-3 items-end flex-wrap">
        <label className="block">
          <span className="text-xs text-slate-300">Class</span>
          <select
            value={params.class ?? ""}
            onChange={(e) => setParam("class", e.target.value || null)}
            className="mt-1 rounded border border-slate-700 px-2 py-1 text-sm bg-slate-900"
          >
            <option value="">All classes</option>
            {classesQuery.data?.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-300">Status</span>
          <select
            value={params.status ?? ""}
            onChange={(e) => setParam("status", e.target.value || null)}
            className="mt-1 rounded border border-slate-700 px-2 py-1 text-sm bg-slate-900"
          >
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam("q", pendingQ || null);
          }}
          className="flex items-end gap-2"
        >
          <label className="block">
            <span className="text-xs text-slate-300">Search</span>
            <input
              value={pendingQ}
              onChange={(e) => setPendingQ(e.target.value)}
              placeholder="uid, material, manufacturer…"
              className="mt-1 rounded border border-slate-700 px-2 py-1 text-sm w-64"
            />
          </label>
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">UID</th>
              <th className="px-3 py-2 text-left">Class</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Condition</th>
              <th className="px-3 py-2 text-left">Install date</th>
              <th className="px-3 py-2 text-left">Material</th>
            </tr>
          </thead>
          <tbody>
            {assetsQuery.isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-slate-400 text-center">
                  Loading…
                </td>
              </tr>
            )}
            {assetsQuery.data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState
                    title={hasFilters ? "No assets match these filters." : "No assets yet."}
                    hint={
                      hasFilters
                        ? "Try widening the filters or clearing them."
                        : "Import a CSV or add an asset on the map to get started."
                    }
                    action={
                      hasFilters ? (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setImportOpen(true)}>
                          Import assets
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            )}
            {assetsQuery.data?.items.map((a) => (
              <tr key={a.asset_uid} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs">
                  <Link to={`./${a.asset_uid}`} className="text-slate-100 hover:underline">
                    {a.asset_uid}
                  </Link>
                </td>
                <td className="px-3 py-2">{a.class_code}</td>
                <td className="px-3 py-2">{a.status}</td>
                <td className="px-3 py-2">{a.condition ?? <Dash />}</td>
                <td className="px-3 py-2">
                  {a.install_date ? formatDate(a.install_date) : <Dash />}
                </td>
                <td className="px-3 py-2">{a.material ?? <Dash />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assetsQuery.data && (
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>
            Page {assetsQuery.data.page} · {assetsQuery.data.total} total
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParam("page", String(Math.max(1, params.page! - 1)))}
              disabled={params.page! <= 1}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setParam("page", String(params.page! + 1))}
              disabled={
                assetsQuery.data.page * assetsQuery.data.page_size >= assetsQuery.data.total
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
