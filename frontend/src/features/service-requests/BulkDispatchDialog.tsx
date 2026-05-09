import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { translateApiError } from "../../lib/translateApiError";
import { lookupUserByEmployeeNumber } from "../admin/api";
import {
  bulkDispatchServiceRequests,
  type BulkDispatchDefaults,
  type BulkDispatchResponse,
  type SrPriority,
} from "./api";

const CATEGORIES: NonNullable<BulkDispatchDefaults["category"]>[] = [
  "investigation",
  "main_break",
  "flushing",
  "valve_exercise",
  "cleaning",
  "inspection",
  "repair",
  "install",
  "other",
];
const PRIORITIES: SrPriority[] = ["low", "normal", "high", "emergency"];

interface Props {
  srNumbers: string[];
  onClose: () => void;
  /** Called with the result so the parent can clear selection +
   * optionally show a toast. */
  onComplete: (result: BulkDispatchResponse) => void;
}

/**
 * Bulk-dispatch a batch of selected SRs in one supervisor action.
 *
 * Defaults reflect the "auto-route per SR" stance: no priority floor
 * (each SR keeps its own), no explicit assignee (territory routing
 * picks per-SR). The supervisor sets a priority *floor* if they want
 * to bump everything to at least 'high' (the backend never downgrades
 * an emergency below 'emergency'), and an optional employee-number
 * lookup overrides territory routing for the whole batch.
 *
 * Two phases:
 *   1. form: fill defaults → click Dispatch
 *   2. result: render per-SR success/skip breakdown so the supervisor
 *      sees which SRs went out and which (e.g. closed, already-
 *      dispatched) were skipped.
 */
export function BulkDispatchDialog({ srNumbers, onClose, onComplete }: Props) {
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<NonNullable<BulkDispatchDefaults["category"]>>(
    "investigation",
  );
  const [priority, setPriority] = useState<SrPriority | "">(""); // "" = respect each SR's own
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [resolvedAssignee, setResolvedAssignee] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<BulkDispatchResponse | null>(null);

  // Live employee-number resolution. We resolve on blur (not per
  // keystroke) so a typing operator doesn't fire a fetch per
  // character, but they get immediate feedback once they leave the
  // field.
  async function resolveEmployee() {
    const code = employeeNumber.trim();
    if (!code) {
      setResolvedAssignee(null);
      setEmployeeError(null);
      return;
    }
    try {
      const list = await lookupUserByEmployeeNumber(code);
      if (list.items.length === 0) {
        setResolvedAssignee(null);
        setEmployeeError(`No active operator with employee #${code}`);
        return;
      }
      const u = list.items[0];
      if (!u.is_active) {
        setResolvedAssignee(null);
        setEmployeeError(`Operator #${code} (${u.full_name}) is inactive`);
        return;
      }
      setResolvedAssignee({ id: u.id, name: u.full_name });
      setEmployeeError(null);
    } catch (e) {
      setEmployeeError(translateApiError(e as Error));
    }
  }

  const dispatch = useMutation<BulkDispatchResponse, Error>({
    mutationFn: () =>
      bulkDispatchServiceRequests({
        sr_numbers: srNumbers,
        defaults: {
          category,
          priority: priority || undefined,
          assigned_to: resolvedAssignee?.id ?? undefined,
        },
      }),
    onSuccess: (resp) => {
      setResult(resp);
      // Refresh the SR list so dispatched rows update; refresh WO list
      // so the new WOs appear if a supervisor flips over.
      queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["work-orders"] });
      onComplete(resp);
    },
    onError: (e) => setErrorMessage(translateApiError(e)),
  });

  // Esc to close — but not while a dispatch is in flight (avoid
  // partial-result confusion).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !dispatch.isPending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, dispatch.isPending]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    dispatch.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-dispatch-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !dispatch.isPending) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-lg bg-slate-900 p-5 shadow-xl space-y-4">
        <header>
          <h2 id="bulk-dispatch-title" className="text-lg font-semibold text-slate-100">
            {result ? "Dispatch result" : `Dispatch ${srNumbers.length} service request${srNumbers.length === 1 ? "" : "s"}`}
          </h2>
          {!result && (
            <p className="mt-1 text-xs text-slate-400">
              Each request becomes its own work order. Auto-routing assigns by
              territory unless you override.
            </p>
          )}
        </header>

        {errorMessage && <Alert>{errorMessage}</Alert>}

        {!result && (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Category
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="input"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Priority floor
              </span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SrPriority | "")}
                className="input"
              >
                <option value="">Respect each SR&apos;s own</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    At least {p}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">
                Sets a floor — emergencies are never downgraded.
              </p>
            </label>

            <div className="rounded border border-slate-800 bg-slate-950/40 p-3 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Assign all to (optional)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={employeeNumber}
                  onChange={(e) => {
                    setEmployeeNumber(e.target.value);
                    setResolvedAssignee(null);
                    setEmployeeError(null);
                  }}
                  onBlur={resolveEmployee}
                  placeholder="Employee #"
                  className="input flex-1"
                />
                {resolvedAssignee && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmployeeNumber("");
                      setResolvedAssignee(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>
              {resolvedAssignee && (
                <p className="text-xs text-emerald-300">
                  → {resolvedAssignee.name}
                </p>
              )}
              {employeeError && (
                <p className="text-xs text-rose-300">{employeeError}</p>
              )}
              {!resolvedAssignee && !employeeError && (
                <p className="text-[11px] text-slate-500">
                  Leave blank to auto-route per SR by territory.
                </p>
              )}
            </div>

            <footer className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={dispatch.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={dispatch.isPending}>
                {dispatch.isPending
                  ? "Dispatching…"
                  : `Dispatch ${srNumbers.length}`}
              </Button>
            </footer>
          </form>
        )}

        {result && (
          <div className="space-y-3">
            <p className="text-sm text-slate-200">
              <span className="font-semibold text-emerald-300">
                {result.dispatched.length} dispatched
              </span>
              {result.skipped.length > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-amber-300">
                    {result.skipped.length} skipped
                  </span>
                </>
              )}
            </p>
            {result.skipped.length > 0 && (
              <div className="rounded border border-amber-700/30 bg-amber-950/10 p-3 space-y-1.5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-amber-300">
                  Skipped
                </p>
                <ul className="space-y-0.5 text-xs">
                  {result.skipped.map((row) => (
                    <li key={row.sr_number} className="font-mono">
                      <span className="text-slate-200">{row.sr_number}</span>
                      <span className="text-slate-500"> — {row.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <footer className="flex justify-end pt-2">
              <Button onClick={onClose}>Done</Button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
