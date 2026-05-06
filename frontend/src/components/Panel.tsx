import type { ReactNode } from "react";

/**
 * Standard content panel: rounded border, slate-900 bg, p-4. Optional
 * title renders as the section's eyebrow. Use this everywhere a page
 * groups information into a card-like region instead of hand-rolling
 * the same `rounded border border-slate-800 bg-slate-900 p-4` classes.
 */

interface Props {
  title?: ReactNode;
  /** Optional content on the right side of the title row (links,
   * action buttons, counts). */
  trailing?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, trailing, className = "", children }: Props) {
  return (
    <section className={`rounded-md border border-slate-800 bg-slate-900 p-4 ${className}`.trim()}>
      {(title || trailing) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {typeof title === "string" ? (
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</h2>
          ) : (
            title
          )}
          {trailing}
        </div>
      )}
      {children}
    </section>
  );
}
