import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button";
import { ApiError } from "../../lib/apiClient";
import { translateApiError } from "../../lib/translateApiError";
import { lookupUserByEmployeeNumber } from "../admin/api";
import { updateWorkOrder } from "./api";

/**
 * Crew-floor assignment widget. Renders the current assignee inline and
 * lets a supervisor type the operator's employee number to (re)assign
 * the WO without scrolling a 200-row dropdown.
 *
 * Lookup is exact-match against `User.employee_number`; if the typed
 * code resolves to zero or multiple users we surface the issue inline
 * rather than guessing — the dispatcher repeats the radio call instead
 * of mis-assigning a callout.
 *
 * Permission: admin/supervisor only. Hidden for tech (the field crew
 * receives assignments; they don't hand them out).
 */

interface Props {
  woNumber: string;
  assignedTo: number | null;
  assigneeFullName: string | null;
  assigneeEmployeeNumber: string | null;
  canAssign: boolean;
}

export function AssignByEmployeeNumber({
  woNumber,
  assignedTo,
  assigneeFullName,
  assigneeEmployeeNumber,
  canAssign,
}: Props) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = useMutation({
    mutationFn: (assigned_to: number | null) =>
      updateWorkOrder(woNumber, { assigned_to: assigned_to ?? null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-order", woNumber] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      setPending("");
      setErrorMessage(null);
    },
    onError: (e: Error) => setErrorMessage(translateApiError(e)),
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const code = pending.trim();
    if (!code) return;
    setErrorMessage(null);
    setBusy(true);
    try {
      const resp = await lookupUserByEmployeeNumber(code);
      if (resp.items.length === 0) {
        setErrorMessage(`No operator with employee number ${code}.`);
        return;
      }
      if (resp.items.length > 1) {
        // The unique constraint should prevent this, but guard anyway —
        // duplicate codes would otherwise pick the first arbitrarily.
        setErrorMessage(`Employee number ${code} matches multiple users.`);
        return;
      }
      const target = resp.items[0];
      if (!target.is_active) {
        setErrorMessage(`Operator ${target.full_name} (${code}) is inactive.`);
        return;
      }
      update.mutate(target.id);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      setErrorMessage(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!canAssign && assignedTo === null) return null;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="section-label-strong">Assignee</h2>
        {assignedTo !== null ? (
          <div className="flex items-baseline gap-2 text-sm">
            <span className="text-slate-100">{assigneeFullName ?? "(unknown)"}</span>
            {assigneeEmployeeNumber && (
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                · {assigneeEmployeeNumber}
              </span>
            )}
            {canAssign && (
              <button
                type="button"
                onClick={() => update.mutate(null)}
                disabled={update.isPending}
                className="ml-2 rounded border border-slate-700 px-2 py-0.5 text-[11px] uppercase tracking-wider text-slate-400 hover:border-slate-500 hover:text-slate-200"
              >
                Unassign
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm text-slate-500">Unassigned</span>
        )}
        {canAssign && (
          <form onSubmit={onSubmit} className="ml-auto flex items-center gap-2">
            <label className="block">
              <span className="sr-only">Assign by employee number</span>
              <input
                value={pending}
                onChange={(e) => setPending(e.target.value)}
                placeholder="Employee #"
                inputMode="numeric"
                className="w-32 rounded border border-slate-700 bg-slate-950/40 px-2 py-1 text-sm font-mono"
              />
            </label>
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              disabled={!pending.trim() || busy || update.isPending}
            >
              {busy || update.isPending ? "Assigning…" : "Assign"}
            </Button>
          </form>
        )}
      </div>
      {errorMessage && (
        <p className="mt-2 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
