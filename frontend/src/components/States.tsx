import type { ReactNode } from "react";

/**
 * Standardised loading / error / empty states. Drop these into
 * `if (q.isLoading)` / `if (q.isError)` / `q.data?.items.length === 0`
 * branches instead of one-off `<p className="text-slate-500">Loading…</p>`.
 */

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-8 section-label">
      <span className="inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full bg-signal" />
      {label}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-4 py-6 text-sm text-rose-200">
      <p>{message}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-rose-300 underline hover:text-rose-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-sm text-slate-300">{title}</p>
      {hint && <p className="section-label">{hint}</p>}
      {action}
    </div>
  );
}
