import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/States";
import { DOMAIN_DOT, DOMAIN_LABEL_SHORT } from "../../lib/theme";
import { translateApiError } from "../../lib/translateApiError";
import { listUsers, type UserRead } from "../admin/api";
import { useAuth } from "../auth/useAuth";
import {
  createDailyAssignment,
  deleteDailyAssignment,
  listDailyAssignments,
  listServiceAreas,
  type DailyAssignmentRead,
} from "./api";

/**
 * Day-planning roster — supervisor surfaces who's covering which
 * service area today (and any other date). Each area renders as a
 * column with assigned operators as removable chips; an inline picker
 * inside each column lets the supervisor add an operator by clicking
 * a name. New SRs and dispatched WOs that fall geographically inside
 * an area auto-default to today's primary operator (lowest-priority
 * row); the dispatcher can always override.
 *
 * Tablet-first layout: areas stack on small screens, grid on lg+.
 */

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PlanningPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles.some((r) => r.code === "admin");
  const isSupervisor = !!user?.roles.some((r) => r.code === "supervisor");
  const canEdit = isAdmin || isSupervisor;

  const [date, setDate] = useState(todayISO());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const areasQuery = useQuery({ queryKey: ["service-areas"], queryFn: listServiceAreas });
  const usersQuery = useQuery({ queryKey: ["admin", "users"], queryFn: listUsers });
  const assignmentsQuery = useQuery({
    queryKey: ["daily-assignments", date],
    queryFn: () => listDailyAssignments(date),
  });

  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: createDailyAssignment,
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["daily-assignments", date] });
    },
    onError: (e: Error) => setErrorMessage(translateApiError(e)),
  });
  const remove = useMutation({
    mutationFn: deleteDailyAssignment,
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["daily-assignments", date] });
    },
    onError: (e: Error) => setErrorMessage(translateApiError(e)),
  });

  // Index assignments by area_id for the column rendering. Multiple
  // operators per area is supported (primary + backup) so each entry
  // is a list, ordered by priority.
  const byArea = useMemo(() => {
    const m = new Map<number, DailyAssignmentRead[]>();
    for (const a of assignmentsQuery.data?.items ?? []) {
      if (!m.has(a.area_id)) m.set(a.area_id, []);
      m.get(a.area_id)!.push(a);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.priority - b.priority);
    }
    return m;
  }, [assignmentsQuery.data]);

  // Operators: just the active users with a tech/supervisor role. Admins
  // can self-assign too but they're rarely the field crew, so we keep
  // them out of the default picker.
  const operators = useMemo(() => {
    const list = usersQuery.data?.items ?? [];
    return list.filter(
      (u) =>
        u.is_active &&
        u.roles.some((r) => r.code === "tech" || r.code === "supervisor"),
    );
  }, [usersQuery.data]);

  const loading = areasQuery.isLoading || assignmentsQuery.isLoading || usersQuery.isLoading;

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <PageHeader
        eyebrow="Plan"
        title="Day roster"
        caption="Who covers which territory today. SRs that fall inside a covered area auto-default to that day's primary operator on dispatch."
        trailing={
          <label className="flex items-baseline gap-2 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayISO())}
              className="rounded border border-slate-700 bg-slate-950/40 px-2 py-1 text-sm tabular-nums"
            />
          </label>
        }
      />

      {errorMessage && <Alert>{errorMessage}</Alert>}

      {loading && <LoadingState />}
      {areasQuery.isError && (
        <ErrorState message="Could not load service areas." retry={() => areasQuery.refetch()} />
      )}
      {usersQuery.isError && (
        <ErrorState message="Could not load operators." retry={() => usersQuery.refetch()} />
      )}

      {!loading && (areasQuery.data?.items.length ?? 0) === 0 && (
        <div className="rounded border border-dashed border-slate-700 bg-slate-900 p-6 text-sm text-slate-400">
          No service areas configured yet. Add areas under{" "}
          <span className="font-mono">/admin/asset-classes</span> (TODO: dedicated area admin) to
          start building a roster.
        </div>
      )}

      {!loading && (areasQuery.data?.items.length ?? 0) > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {areasQuery.data?.items.map((area) => (
            <AreaColumn
              key={area.id}
              area={area}
              assignments={byArea.get(area.id) ?? []}
              operators={operators}
              canEdit={canEdit}
              busy={create.isPending || remove.isPending}
              onAssign={(user_id, priority) =>
                create.mutate({
                  user_id,
                  area_id: area.id,
                  on_date: date,
                  priority,
                })
              }
              onRemove={(id) => remove.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface AreaColumnProps {
  area: { id: number; code: string; name: string; kind: string };
  assignments: DailyAssignmentRead[];
  operators: UserRead[];
  canEdit: boolean;
  busy: boolean;
  onAssign: (user_id: number, priority: number) => void;
  onRemove: (id: number) => void;
}

function AreaColumn({
  area,
  assignments,
  operators,
  canEdit,
  busy,
  onAssign,
  onRemove,
}: AreaColumnProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingPriority, setPendingPriority] = useState(1);
  // Hide operators already assigned at any priority — the unique
  // constraint would 409 anyway and the picker should reflect that.
  const assignedIds = new Set(assignments.map((a) => a.user_id));
  const available = operators.filter((u) => !assignedIds.has(u.id));

  const labelShort = DOMAIN_LABEL_SHORT[area.kind] ?? area.kind;
  const dot = DOMAIN_DOT[area.kind] ?? "bg-slate-500";

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <header className="mb-3 flex items-baseline justify-between border-b border-dashed border-slate-800 pb-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span aria-hidden className={`inline-block h-1.5 w-1.5 translate-y-[1px] rounded-full ${dot}`} />
            <h3 className="section-label-strong">{area.name}</h3>
          </div>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
            {labelShort} · {area.code}
          </p>
        </div>
        <span className="font-mono text-[10px] tabular-nums text-slate-500">
          {assignments.length}
        </span>
      </header>

      {assignments.length === 0 ? (
        <p className="py-2 text-xs text-slate-500">No one rostered.</p>
      ) : (
        <ul className="space-y-1.5">
          {assignments.map((a) => (
            <li
              key={a.id}
              className="flex items-baseline justify-between gap-2 rounded border border-slate-800 bg-slate-950/40 px-3 py-1.5"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] tabular-nums text-slate-500">
                  P{a.priority}
                </span>
                <span className="text-sm text-slate-100">
                  {a.user_full_name ?? `user ${a.user_id}`}
                </span>
                {a.user_employee_number && (
                  <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    · {a.user_employee_number}
                  </span>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onRemove(a.id)}
                  disabled={busy}
                  aria-label={`Remove ${a.user_full_name} from ${area.name}`}
                  className="rounded border border-slate-700 px-2 py-0.5 text-[11px] uppercase tracking-wider text-slate-400 hover:border-rose-500/50 hover:text-rose-200"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="mt-3 border-t border-dashed border-slate-800 pt-3">
          {!pickerOpen ? (
            <Button size="sm" variant="ghost" onClick={() => setPickerOpen(true)} disabled={busy}>
              + Add operator
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  Priority
                </span>
                <select
                  value={pendingPriority}
                  onChange={(e) => setPendingPriority(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-950/40 px-2 py-0.5 text-xs"
                >
                  <option value={1}>1 — primary</option>
                  <option value={2}>2 — backup</option>
                  <option value={3}>3</option>
                </select>
              </div>
              {available.length === 0 ? (
                <p className="text-xs text-slate-500">All operators already covering this area.</p>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {available.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onAssign(u.id, pendingPriority);
                          setPickerOpen(false);
                        }}
                        disabled={busy}
                        className="rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-200 hover:border-signal/40 hover:bg-slate-800"
                      >
                        {u.full_name}
                        {u.employee_number && (
                          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                            · {u.employee_number}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
