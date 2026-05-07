import { useState } from "react";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Dash } from "../../components/Dash";
import { ErrorState, LoadingState } from "../../components/States";
import { StatusPill } from "../../components/StatusPill";
import { formatDateTime } from "../../lib/format";
import { translateApiError } from "../../lib/translateApiError";
import { CreateScheduleDialog, type ScheduleTemplatePrefill } from "./CreateScheduleDialog";
import { type ScheduleRead } from "./api";
import { useDeleteSchedule, useSchedules, useTickSchedules, useUpdateSchedule } from "./hooks";

/**
 * Suggested schedules tailored to small-utility maintenance programs.
 * These are NOT created automatically — they're inspirational
 * starting points that prefill the Create dialog when clicked.
 */
const SCHEDULE_TEMPLATES: Array<ScheduleTemplatePrefill & { blurb: string }> = [
  {
    name: "Hydrant flushing — quarterly",
    description: "AWWA-recommended unidirectional flush across each pressure zone.",
    blurb:
      "Quarterly flushing keeps water-quality complaints down and exercises the valves at the same time.",
    kind: "work_order",
    rrule: "FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1",
    woCategory: "flushing",
  },
  {
    name: "Valve exercising — semi-annual",
    description: "Operate every distribution valve through full open/close, log torque + turns.",
    blurb:
      "Stuck valves cost hours during a main-break response. Twice-a-year exercising catches them early.",
    kind: "work_order",
    rrule: "FREQ=MONTHLY;INTERVAL=6;BYMONTHDAY=15",
    woCategory: "valve_exercise",
  },
  {
    name: "Catch basin cleaning — pre-spring",
    description: "Sediment + debris removal ahead of snowmelt + spring rains.",
    blurb: "Run once in March before peak rainfall. Reduces downstream flooding complaints.",
    kind: "work_order",
    rrule: "FREQ=YEARLY;BYMONTH=3;BYMONTHDAY=15",
    woCategory: "cleaning",
  },
  {
    name: "Lift station rounds — weekly",
    description: "Visual + operational check of pumps, alarms, wet wells.",
    blurb: "Weekly rounds catch impeller wear + float issues before they become callouts.",
    kind: "inspection",
    rrule: "FREQ=WEEKLY;BYDAY=MO",
    insKind: "lift_station_round",
  },
  {
    name: "Manhole condition assessment — annual",
    description: "Visual inspection of the top 10% of the network on a 10-year rotating cycle.",
    blurb: "Cheaper than CCTV, identifies candidates for full PACP survey.",
    kind: "inspection",
    rrule: "FREQ=YEARLY;BYMONTH=6;BYMONTHDAY=1",
    insKind: "manhole",
  },
  {
    name: "Hydrant flow test — annual",
    description: "Static + residual + flow on every hydrant; updates AWWA NFPA 291 colour class.",
    blurb:
      "Required by most insurance + ISO ratings. Drives hydrant colour-coding for fire response.",
    kind: "inspection",
    rrule: "FREQ=YEARLY;BYMONTH=5;BYMONTHDAY=1",
    insKind: "hydrant_flow",
  },
];

export function SchedulesPage() {
  const query = useSchedules();
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitial, setCreateInitial] = useState<ScheduleTemplatePrefill | undefined>();
  const [tickResult, setTickResult] = useState<string | null>(null);
  const [tickError, setTickError] = useState<string | null>(null);
  const tick = useTickSchedules();

  function openCreate(initial?: ScheduleTemplatePrefill) {
    setCreateInitial(initial);
    setCreateOpen(true);
  }
  function closeCreate() {
    setCreateOpen(false);
    setCreateInitial(undefined);
  }

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
    <div className="p-4 sm:p-8 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
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
          <Button onClick={() => openCreate()}>+ New schedule</Button>
        </div>
      </header>

      {tickResult && <Alert variant="info">{tickResult}</Alert>}
      {tickError && <Alert>{tickError}</Alert>}

      {query.isLoading && <LoadingState />}
      {query.isError && (
        <ErrorState message="Failed to load schedules." retry={() => query.refetch()} />
      )}

      {query.data && query.data.items.length > 0 && (
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
            </tbody>
          </table>
        </div>
      )}

      {/* Rich empty state — explains the value of recurring schedules
          for a small water utility, then offers six concrete templates
          drawn from real PM programs (AWWA flushing cadence, valve
          exercising, lift station rounds, hydrant flow tests…).
          Clicking a template prefills the Create dialog. */}
      {query.data && query.data.items.length === 0 && <EmptySchedulesHero onPick={openCreate} />}

      {createOpen && <CreateScheduleDialog onClose={closeCreate} initial={createInitial} />}
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

/* -------------------------------------------------------------------------- */
/* Empty-state hero — value pitch + suggested template cards.                 */
/* -------------------------------------------------------------------------- */

function EmptySchedulesHero({ onPick }: { onPick: (initial: ScheduleTemplatePrefill) => void }) {
  return (
    <div className="space-y-6">
      {/* Headline + the why */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          No schedules yet
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-100">
          Stop forgetting the work that runs the utility.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
          Schedules generate work orders + inspections automatically on the cadence you set:
          quarterly hydrant flushing, weekly lift-station rounds, semi-annual valve exercising. The
          system creates them, your crews close them, you have an audit trail without anyone keeping
          a separate calendar.
        </p>
      </section>

      {/* Six template cards */}
      <section>
        <header className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-300">
            Suggested schedules
          </h3>
          <p className="text-xs text-slate-500">Click a card to start with it pre-filled.</p>
        </header>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SCHEDULE_TEMPLATES.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() => onPick(t)}
              className="group flex flex-col gap-2 rounded-md border border-slate-800 bg-slate-900 p-4 text-left transition-colors hover:border-blue-500/50 hover:bg-slate-900/80"
            >
              <header className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-medium text-slate-100 group-hover:text-blue-300">
                  {t.name}
                </h4>
                <StatusPill tone={t.kind === "work_order" ? "info" : "neutral"}>
                  {t.kind === "work_order" ? "WO" : "Inspection"}
                </StatusPill>
              </header>
              <p className="text-xs leading-snug text-slate-400">{t.blurb}</p>
              <p className="font-mono text-[10px] text-slate-500">{t.rrule}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
