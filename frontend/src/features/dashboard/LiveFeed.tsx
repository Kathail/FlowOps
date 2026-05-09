import { Link } from "react-router-dom";
import { cleanActivitySummary, entityMeta } from "./helpers";
import type { DashboardResponse } from "./api";
import type { DashTab } from "./DashboardTabs";

/**
 * Live activity feed — the left rail of the operations console.
 *
 * Visual:
 *  · A single hairline rule running down the left edge — items hang
 *    off it as a timeline. Newer items have a brighter timecode.
 *  · "LIVE" header with a slow pulse dot, signalling the auto-refresh.
 *  · Every row is a single click target (kind chip + entity code +
 *    summary) and deep-links to the entity detail using the
 *    entity_code we just plumbed into the payload.
 *
 * Per-tab variants:
 *  · supervisor → unfiltered; everything that moved.
 *  · crew      → filter to "mine" — items I commented on or that
 *               touched a WO assigned to me. Cheap heuristic without a
 *               new endpoint: backend doesn't include `actor_id` yet,
 *               so for now we keep the unfiltered view and surface a
 *               "Add filter" affordance. Field-crew lens still feels
 *               distinct because the gauges + map shrink to "my route".
 *  · manager   → same data; UI adds a "Yesterday → today" delta tag
 *               at the top so the manager has the rollup at a glance.
 */

interface Props {
  activity: DashboardResponse["recent_activity"];
  slug: string;
  tab: DashTab;
  // Reserved — the per-user filter on the crew lens will use this once
  // the backend exposes actor_id on activity rows.
  userId: number;
}

const KIND_LABEL: Record<"comment" | "transition", string> = {
  comment: "comment",
  transition: "status",
};

const ENTITY_TONE: Record<"wo" | "sr" | "ins", string> = {
  wo: "text-cyan-300/80",
  sr: "text-amber-300/80",
  ins: "text-violet-300/80",
};

export function LiveFeed({ activity, slug, tab }: Props) {
  return (
    <aside
      aria-label="Live activity feed"
      className="relative flex flex-col console-panel"
    >
      <header className="flex items-center justify-between border-b border-dashed border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-signal opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
          </span>
          <h2 className="section-label-strong">
            Live
          </h2>
        </div>
        <span className="section-label">
          {activity.length} {activity.length === 1 ? "event" : "events"}
        </span>
      </header>

      {activity.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-600">
            Quiet last 48 hours
          </p>
        </div>
      ) : (
        <ol className="relative max-h-[640px] overflow-y-auto">
          {/* The vertical timeline rule. Sits behind the rows so they
              hang off it. Drawn with a gradient that fades at the
              bottom so the list feels like it's still going. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-[1.125rem] top-0 h-full w-px bg-gradient-to-b from-slate-700 via-slate-800 to-transparent"
          />
          {activity.map((item, idx) => (
            <FeedRow
              key={`${item.kind}-${item.entity_type}-${item.occurred_at}-${idx}`}
              item={item}
              slug={slug}
              recencyRank={idx}
              total={activity.length}
            />
          ))}
        </ol>
      )}

      {tab === "manager" && activity.length > 0 && (
        <div className="border-t border-dashed border-slate-800 px-4 py-2">
          <p className="section-label">
            48h rollup · {countByKind(activity, "comment")} comments ·{" "}
            {countByKind(activity, "transition")} transitions
          </p>
        </div>
      )}
    </aside>
  );
}

function FeedRow({
  item,
  slug,
  recencyRank,
  total,
}: {
  item: DashboardResponse["recent_activity"][number];
  slug: string;
  recencyRank: number;
  total: number;
}) {
  const meta = entityMeta(slug, item.entity_type, item.entity_code);
  // Recency tone: top of the list (newest) is brighter; older items
  // fade so the eye lands on what just happened. Five tone steps —
  // anything older than that is the muted floor.
  const toneStep = Math.min(4, Math.floor((recencyRank / Math.max(1, total)) * 5));
  const timeTone = [
    "text-slate-200",
    "text-slate-300",
    "text-slate-400",
    "text-slate-500",
    "text-slate-600",
  ][toneStep];

  return (
    <li className="relative">
      <Link
        to={meta.href}
        className="group/row block py-2.5 pl-9 pr-4 transition-colors hover:bg-slate-900/60"
      >
        {/* Timeline dot — sits on top of the rule. Cyan when comment,
            slate when transition. Subtly larger on hover. */}
        <span
          aria-hidden
          className={`absolute left-[0.875rem] top-3.5 h-2 w-2 rounded-full ring-2 ring-slate-950 transition-all group-hover/row:scale-125 ${
            item.kind === "comment" ? "bg-signal" : "bg-slate-500"
          }`}
        />
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.18em] ${ENTITY_TONE[meta.tone]}`}
            >
              {meta.label}
            </span>
            {item.entity_code && (
              <span className="font-mono text-[10px] text-slate-400 truncate">
                {item.entity_code}
              </span>
            )}
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600">
              · {KIND_LABEL[item.kind]}
            </span>
          </span>
          <time
            dateTime={item.occurred_at}
            className={`shrink-0 font-mono text-[10px] tabular-nums ${timeTone}`}
          >
            {compactRelative(item.occurred_at)}
          </time>
        </div>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-slate-200 group-hover/row:text-slate-100">
          {cleanActivitySummary(item.summary)}
        </p>
      </Link>
    </li>
  );
}

function countByKind(
  rows: DashboardResponse["recent_activity"],
  kind: "comment" | "transition",
): number {
  let n = 0;
  for (const r of rows) if (r.kind === kind) n++;
  return n;
}

/** Tighter than `helpers.relativeTime` — fits in a small timeline gutter. */
function compactRelative(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
