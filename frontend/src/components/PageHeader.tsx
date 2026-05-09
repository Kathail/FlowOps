import type { ReactNode } from "react";

/**
 * Shared header for list / index pages (Work orders, Assets, Service
 * requests, Inspections, Schedules, Reports, Admin index). Consistent
 * shape: a section eyebrow above a title, optional count chip on the
 * right, optional trailing action(s), and a hairline rule beneath.
 *
 * Detail pages use `DetailHeader` instead — different shape (back
 * link + larger title + status pill column).
 */

interface Props {
  /** Eyebrow above the title — small mono uppercase. Often the
   * tenant section ("Work orders" → eyebrow "Operations"). */
  eyebrow?: string;
  /** Page title — sentence case, no trailing colon. */
  title: ReactNode;
  /** One-line caption under the title (e.g. "13 active · 4 overdue"). */
  caption?: ReactNode;
  /** Right-side actions: filter button, primary action, search box. */
  trailing?: ReactNode;
}

export function PageHeader({ eyebrow, title, caption, trailing }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-dashed border-slate-800 pb-4">
      <div className="min-w-0">
        {eyebrow && <p className="section-label">{eyebrow}</p>}
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-100">{title}</h1>
        {caption && <p className="mt-1 section-label">{caption}</p>}
      </div>
      {trailing && <div className="flex flex-wrap items-center gap-2">{trailing}</div>}
    </header>
  );
}
