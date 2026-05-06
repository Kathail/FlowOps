import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Standardised back-link + title block for entity detail pages
 * (work order, service request, asset, inspection, etc.). Trailing
 * content on the right is for status pills / primary actions.
 */

interface Props {
  backTo: string;
  backLabel: string;
  title: ReactNode;
  /** Subtitle line under the title (e.g. "main_break · sewer · high"). */
  subtitle?: ReactNode;
  /** Right-side content — status pill, primary actions. */
  trailing?: ReactNode;
  /** Optional bottom row — chips, area badges, etc. */
  meta?: ReactNode;
}

export function DetailHeader({ backTo, backLabel, title, subtitle, trailing, meta }: Props) {
  return (
    <header className="space-y-1">
      <Link to={backTo} className="text-sm text-slate-400 hover:underline">
        ← {backLabel}
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          {meta && <div className="mt-2">{meta}</div>}
        </div>
        {trailing && <div className="flex flex-col items-end gap-2">{trailing}</div>}
      </div>
    </header>
  );
}
