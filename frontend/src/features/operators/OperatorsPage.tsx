import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/States";
import { DOMAIN_DOT, DOMAIN_LABEL_SHORT } from "../../lib/theme";
import { getOperatorLoad, type OperatorLoad } from "./api";

/**
 * Operator overview — supervisor view of every active operator's
 * current load. Pairs with the Day Roster (which is area-centric):
 * this one is operator-centric. A supervisor scanning here can spot
 * imbalance ("Tom has 8 open + 2 emergencies, Sara has 0") and
 * rebalance the day before things slide overdue.
 *
 * Counts are *current* (open / in_progress / overdue) regardless of
 * the date param; the date only narrows the territory chips, so the
 * supervisor can preview tomorrow's roster without losing today's
 * load picture.
 */

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function OperatorsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [date, setDate] = useState(todayISO());
  const query = useQuery({
    queryKey: ["operator-load", date],
    queryFn: () => getOperatorLoad(date),
  });

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <PageHeader
        eyebrow="Plan"
        title="Operators"
        caption="Who's on shift, what they're carrying, and where they're rostered."
        trailing={
          <label className="flex items-baseline gap-2 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              date
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayISO())}
              className="rounded border border-slate-700 bg-slate-950/40 px-2 py-1 text-sm tabular-nums"
            />
          </label>
        }
      />

      {query.isLoading && <LoadingState />}
      {query.isError && (
        <ErrorState
          message="Could not load operator overview."
          retry={() => query.refetch()}
        />
      )}

      {query.data && query.data.items.length === 0 && (
        <div className="rounded border border-dashed border-slate-700 bg-slate-900 p-6 text-sm text-slate-400">
          No active tech or supervisor accounts found.
        </div>
      )}

      {query.data && query.data.items.length > 0 && (
        <div className="space-y-2">
          {query.data.items.map((op) => (
            <OperatorRow key={op.user_id} op={op} slug={slug ?? ""} />
          ))}
        </div>
      )}
    </div>
  );
}

function OperatorRow({ op, slug }: { op: OperatorLoad; slug: string }) {
  const woHref = `/${slug}/work-orders?assigned_to=${op.user_id}`;
  const total = op.open_wos + op.in_progress_wos;
  const tone =
    op.emergency_wos > 0
      ? "border-rose-700/60 bg-rose-950/20"
      : op.overdue_wos > 0
        ? "border-amber-700/40 bg-amber-950/10"
        : "border-slate-800 bg-slate-900/60";

  return (
    <Link
      to={woHref}
      className={`group block rounded-lg border ${tone} p-4 transition-colors hover:border-signal/40`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-semibold text-slate-100">
              {op.full_name}
            </span>
            {op.employee_number && (
              <span className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                #{op.employee_number}
              </span>
            )}
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {op.role_codes.join(" · ")}
            </span>
            {op.title && (
              <span className="text-xs text-slate-400">· {op.title}</span>
            )}
          </div>
          {op.today_areas.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {op.today_areas.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-baseline gap-1.5 rounded border border-slate-800 bg-slate-950/40 px-2 py-0.5 text-[11px]"
                >
                  <span aria-hidden className={`inline-block h-1.5 w-1.5 translate-y-[1px] rounded-full ${DOMAIN_DOT[a.kind] ?? "bg-slate-500"}`} />
                  <span className="text-slate-200">{a.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    P{a.priority} · {DOMAIN_LABEL_SHORT[a.kind] ?? a.kind}
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">No territory assigned this date.</p>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-4">
          <Stat label="open" value={op.open_wos} />
          <Stat label="in progress" value={op.in_progress_wos} />
          <Stat
            label="due today"
            value={op.due_today_wos}
            tone={op.due_today_wos > 0 ? "amber" : undefined}
          />
          <Stat
            label="overdue"
            value={op.overdue_wos}
            tone={op.overdue_wos > 0 ? "amber" : undefined}
          />
          <Stat
            label="emergency"
            value={op.emergency_wos}
            tone={op.emergency_wos > 0 ? "rose" : undefined}
          />
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600 group-hover:text-signal">
            {total} active →
          </span>
        </div>
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "rose" | "amber";
}) {
  const valueClass =
    tone === "rose"
      ? "text-rose-300"
      : tone === "amber"
        ? "text-amber-300"
        : value > 0
          ? "text-slate-100"
          : "text-slate-600";
  return (
    <div className="flex flex-col items-end">
      <span className={`text-base tabular-nums ${valueClass}`}>{value}</span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
    </div>
  );
}
