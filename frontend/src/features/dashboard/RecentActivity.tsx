import { Link } from "react-router-dom";
import type { DashboardResponse } from "./api";
import { cleanActivitySummary, entityMeta, relativeTime } from "./helpers";

/**
 * Most-recent comments + status transitions across the tenant's
 * entities. Uses a small entity-type chip so the eye can scan
 * "WO / SR / INS" quickly. Strips the legacy "[sim] " prefix from
 * synthetic-data summaries so demo content reads like real activity.
 */

const ENTITY_CHIP: Record<"wo" | "sr" | "ins", string> = {
  wo: "bg-blue-500/15 text-blue-200 ring-blue-500/30",
  sr: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  ins: "bg-purple-500/15 text-purple-200 ring-purple-500/30",
};

export function RecentActivity({
  items,
  slug,
}: {
  items: DashboardResponse["recent_activity"];
  slug: string;
}) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-slate-300">
        Recent activity
      </h2>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Quiet last 48 hours.</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {items.map((item, i) => {
            const meta = entityMeta(slug, item.entity_type);
            return (
              <li key={i} className="flex gap-2.5 text-sm">
                <Link
                  to={meta.href}
                  className={`mt-0.5 inline-flex h-5 shrink-0 items-center justify-center rounded px-1.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${ENTITY_CHIP[meta.tone]}`}
                  aria-label={`View ${meta.label} list`}
                >
                  {meta.label}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-slate-200">
                    {cleanActivitySummary(item.summary)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {item.kind === "comment" ? "comment" : "status change"} ·{" "}
                    {relativeTime(item.occurred_at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
