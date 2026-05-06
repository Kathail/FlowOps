import type { ReactNode } from "react";

/**
 * Standardised loading / error / empty states. Drop these into
 * `if (q.isLoading)` / `if (q.isError)` / `q.data?.items.length === 0`
 * branches instead of one-off `<p className="text-slate-500">Loading…</p>`.
 */

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-8 text-sm text-slate-500">
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-slate-600" />
      {label}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-6 text-sm text-red-200">
      <p>{message}</p>
      {retry && (
        <button type="button" onClick={retry} className="mt-2 text-xs underline hover:text-red-100">
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
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      {action}
    </div>
  );
}
