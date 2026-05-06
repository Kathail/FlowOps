import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/Button";
import { Dash } from "../../components/Dash";
import { EmptyState } from "../../components/States";
import { StatusPill, type PillTone } from "../../components/StatusPill";
import { formatDate } from "../../lib/format";
import { CreateWorkOrderDialog } from "./CreateWorkOrderDialog";
import { KanbanBoard } from "./KanbanBoard";
import { type WoPriority, type WoStatus, type WorkOrderListParams } from "./api";
import { useWorkOrders } from "./hooks";

const STATUS_TONE: Record<WoStatus, PillTone> = {
  draft: "muted",
  open: "info",
  assigned: "info",
  in_progress: "info",
  on_hold: "warning",
  completed: "success",
  cancelled: "neutral",
};

const PRIORITY_TONE: Record<WoPriority, PillTone> = {
  low: "muted",
  normal: "neutral",
  high: "warning",
  emergency: "danger",
};

const STATUSES: WoStatus[] = [
  "draft",
  "open",
  "assigned",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

export function WorkOrderListPage() {
  const [search, setSearch] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const { slug } = useParams<{ slug: string }>();

  const view = search.get("view") === "kanban" ? "kanban" : "list";

  const params: WorkOrderListParams = {
    status: (search.get("status") as WoStatus) || undefined,
    assigned_to: search.get("assigned_to") || undefined,
    q: search.get("q") || undefined,
    page: Number(search.get("page") ?? 1),
    page_size: view === "kanban" ? 200 : 50,
  };
  const woQuery = useWorkOrders(params);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(search);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setSearch(next);
  }

  function clearFilters() {
    const next = new URLSearchParams();
    if (view === "kanban") next.set("view", "kanban");
    setSearch(next);
  }

  const hasFilters = !!(params.status || params.assigned_to || params.q);

  return (
    <div className="p-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-100">Work orders</h1>
        <div className="flex gap-2">
          <div className="rounded border border-slate-700 bg-slate-950/40 p-0.5 flex">
            <button
              onClick={() => setParam("view", null)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                view === "list" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setParam("view", "kanban")}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                view === "kanban" ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-100"
              }`}
            >
              Kanban
            </button>
          </div>
          <Button onClick={() => setCreateOpen(true)}>New work order</Button>
        </div>
      </header>

      {createOpen && <CreateWorkOrderDialog onClose={() => setCreateOpen(false)} />}

      {view === "list" && (
        <>
          <div className="flex gap-3 items-end flex-wrap">
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
            <label className="flex items-end gap-2 text-sm pb-1">
              <input
                type="checkbox"
                checked={search.get("assigned_to") === "me"}
                onChange={(e) => setParam("assigned_to", e.target.checked ? "me" : null)}
              />
              <span>Assigned to me</span>
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
                setParam("q", input.value || null);
              }}
              className="block"
            >
              <label className="block">
                <span className="text-xs text-slate-300">Search</span>
                <input
                  name="q"
                  defaultValue={search.get("q") ?? ""}
                  onBlur={(e) => setParam("q", e.target.value || null)}
                  className="mt-1 rounded border border-slate-700 px-2 py-1 text-sm w-64"
                />
              </label>
            </form>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left">Number</th>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Priority</th>
                  <th className="px-3 py-2 text-left">Asset</th>
                  <th className="px-3 py-2 text-left">Due</th>
                </tr>
              </thead>
              <tbody>
                {woQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {woQuery.data?.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyState
                        title={
                          hasFilters ? "No work orders match these filters." : "No work orders yet."
                        }
                        hint={
                          hasFilters
                            ? "Try widening the filters or clearing them."
                            : "Create one from a service request or directly here."
                        }
                        action={
                          hasFilters ? (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                              Clear filters
                            </Button>
                          ) : (
                            <Button size="sm" onClick={() => setCreateOpen(true)}>
                              New work order
                            </Button>
                          )
                        }
                      />
                    </td>
                  </tr>
                )}
                {woQuery.data?.items.map((w) => (
                  <tr key={w.wo_number} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link to={`./${w.wo_number}`} className="text-slate-100 hover:underline">
                        {w.wo_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{w.title}</td>
                    <td className="px-3 py-2">
                      <StatusPill tone={STATUS_TONE[w.status]} dot>
                        {w.status.replace("_", " ")}
                      </StatusPill>
                    </td>
                    <td className="px-3 py-2">
                      <StatusPill tone={PRIORITY_TONE[w.priority]}>{w.priority}</StatusPill>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{w.asset_uid ?? <Dash />}</td>
                    <td className="px-3 py-2">{w.due_by ? formatDate(w.due_by) : <Dash />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === "kanban" && <KanbanBoard items={woQuery.data?.items ?? []} slug={slug ?? ""} />}
    </div>
  );
}
