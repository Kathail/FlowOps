import { useQuery } from "@tanstack/react-query";
import { ErrorState, LoadingState } from "../../components/States";
import type { TenantOut, UserOut } from "../auth/api";
import { ByArea } from "./ByArea";
import { CategoryChart } from "./CategoryChart";
import { KpiHero } from "./KpiHero";
import { RecentActivity } from "./RecentActivity";
import { SystemPulse } from "./SystemPulse";
import { TodayQueue } from "./TodayQueue";
import { type DashboardResponse, getDashboard } from "./api";

/**
 * Supervisor dashboard — landing page for `/{slug}`.
 *
 * Iteration-3 layout (right column collapsed from 3 cards into 2):
 *
 *   ┌────────────────────────────────────────────────┐
 *   │ Greeting + date                                 │
 *   ├────────────────────────────────────────────────┤
 *   │ KpiHero  (3 large tiles + summary strip below) │
 *   ├──────────────────────────────┬─────────────────┤
 *   │ Today's queue                │ System pulse    │
 *   │   ↓ (operational)            │   (sparkline +  │
 *   │ Service areas                │    SR snapshot +│
 *   │   ↓                          │    priority bar)│
 *   │ Work by category             ├─────────────────┤
 *   │                              │ Recent activity │
 *   └──────────────────────────────┴─────────────────┘
 *
 * Left column = "what's happening / where" (operational + spatial).
 * Right column = "system pulse + change log" (situational + audit).
 */

interface Props {
  user: UserOut;
  tenant: TenantOut;
}

export function Dashboard({ user, tenant }: Props) {
  const dash = useQuery<DashboardResponse, Error>({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
    // Poll every minute. `refetchIntervalInBackground: false` is the
    // TanStack v5 default — explicit here so it's clear that a tab in
    // the background won't burn cycles polling. A supervisor with the
    // dashboard in a hidden tab gets fresh data on focus instead.
    // DASH-P1-8.
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-100">
          Welcome, {user.full_name.split(" ")[0]}
        </h1>
        <p className="text-xs text-slate-400">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}{" "}
          · {tenant.name}
        </p>
      </header>

      {/* Show the spinner only on first paint, and the error banner only
          when there's no cached data to fall back to (DASH-P1-4). A
          background refetch failure with cached data still good leaves
          the prior render in place; a small "stale" affordance could
          land here later but isn't worth the noise today. */}
      {dash.isLoading && !dash.data && <LoadingState />}
      {dash.isError && !dash.data && (
        <ErrorState message="Failed to load dashboard." retry={() => dash.refetch()} />
      )}

      {dash.data && (
        <>
          <KpiHero data={dash.data} slug={tenant.slug} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* LEFT: operational — what's on today, who has what, where. */}
            <div className="space-y-4 lg:col-span-2">
              <TodayQueue items={dash.data.today_queue} slug={tenant.slug} />
              <ByArea rows={dash.data.by_area} slug={tenant.slug} />
              <CategoryChart buckets={dash.data.wo_by_category_30d} />
            </div>

            {/* RIGHT: situational — system pulse + recent change. Two
                cards instead of three so the rail reads as a single
                column of summaries. */}
            <div className="space-y-4">
              <SystemPulse
                srKpis={dash.data.sr_kpis}
                srBuckets={dash.data.sr_by_priority_30d}
                throughput={dash.data.throughput_7d}
                completedThisWeek={dash.data.wo_kpis.completed_this_week}
                slug={tenant.slug}
              />
              <RecentActivity items={dash.data.recent_activity} slug={tenant.slug} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
