import { useState } from "react";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Dash } from "../../components/Dash";
import { ErrorState, LoadingState } from "../../components/States";
import { StatusPill } from "../../components/StatusPill";
import { formatDateTime } from "../../lib/format";
import { translateApiError } from "../../lib/translateApiError";
import { CreateScheduleDialog } from "./CreateScheduleDialog";
import { type ScheduleRead } from "./api";
import { useDeleteSchedule, useSchedules, useTickSchedules, useUpdateSchedule } from "./hooks";

export function SchedulesPage() {
  const query = useSchedules();
  const [createOpen, setCreateOpen] = useState(false);
  const [tickResult, setTickResult] = useState<string | null>(null);
  const [tickError, setTickError] = useState<string | null>(null);
  const tick = useTickSchedules();

  async function fireTick() {
    setTickResult(null);
    setTickError(null);
    try {
      const r = await tick.mutateAsync();
      setTickResult(
        `Fired ${r.fired} of ${r.schedules_processed} due schedule${r.schedules_processed === 1 ? "" : "s"}` +
          (r.instances.length ? ` — created ${r.instances.join(", ")}` : ""),
      );
    } catch (err) {
      setTickError(translateApiError(err));
    }
  }

  return (
    <div className="p-8 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Schedules</h1>
          <p className="text-sm text-slate-400">
            Recurring work orders + inspections, expressed as iCalendar RRULE.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={fireTick}
            disabled={tick.isPending}
            title="Manually fire any due schedules"
          >
            {tick.isPending ? "Ticking…" : "Run tick now"}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>+ New schedule</Button>
        </div>
      </header>

      {tickResult && <Alert variant="info">{tickResult}</Alert>}
      {tickError && <Alert>{tickError}</Alert>}

      {query.isLoading && <LoadingState />}
      {query.isError && (
        <ErrorState message="Failed to load schedules." retry={() => query.refetch()} />
      )}

      {query.data && (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/40 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">RRULE</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Next run</th>
                <th className="px-3 py-2">Last run</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {query.data.items.map((s) => (
                <Row key={s.id} schedule={s} />
              ))}
              {query.data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-slate-500">
                    No schedules yet. Click "New schedule" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && <CreateScheduleDialog onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function Row({ schedule }: { schedule: ScheduleRead }) {
  const update = useUpdateSchedule(schedule.id);
  const remove = useDeleteSchedule();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  return (
    <>
      <tr>
        <td className="px-3 py-2">
          <div className="text-slate-100">{schedule.name}</div>
          {schedule.description && (
            <div className="text-xs text-slate-500">{schedule.description}</div>
          )}
        </td>
        <td className="px-3 py-2">
          <StatusPill tone={schedule.kind === "work_order" ? "info" : "neutral"}>
            {schedule.kind === "work_order" ? "WO" : "Inspection"}
          </StatusPill>
        </td>
        <td className="px-3 py-2 font-mono text-xs text-slate-300">{schedule.rrule}</td>
        <td className="px-3 py-2 font-mono text-xs text-slate-400">
          {schedule.asset_uid ?? <Dash />}
        </td>
        <td className="px-3 py-2 text-xs text-slate-300">
          {formatDateTime(schedule.next_run_at) || <Dash />}
        </td>
        <td className="px-3 py-2 text-xs text-slate-500">
          {schedule.last_run_at ? formatDateTime(schedule.last_run_at) : "never"}
        </td>
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={() => update.mutate({ active: !schedule.active })}
            className={`text-xs hover:underline ${schedule.active ? "text-emerald-300" : "text-slate-500"}`}
            aria-label={schedule.active ? "Pause schedule" : "Activate schedule"}
          >
            {schedule.active ? "active" : "paused"}
          </button>
        </td>
        <td className="px-3 py-2 text-right">
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
            className="text-xs text-red-300 hover:text-red-200 hover:underline"
          >
            Delete
          </button>
        </td>
      </tr>
      {deleteOpen && (
        <ConfirmDialog
          title={`Delete schedule "${schedule.name}"?`}
          message="The schedule and any future runs are removed. Existing work orders or inspections it has already created stay in place."
          confirmLabel="Delete schedule"
          errorMessage={deleteError}
          busy={remove.isPending}
          onConfirm={() =>
            remove.mutate(schedule.id, {
              onSuccess: () => setDeleteOpen(false),
              onError: (e) => setDeleteError(translateApiError(e)),
            })
          }
          onCancel={() => setDeleteOpen(false)}
        />
      )}
    </>
  );
}
