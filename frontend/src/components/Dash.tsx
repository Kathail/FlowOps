/**
 * Standardised "no value" placeholder. Use anywhere a field is
 * legitimately blank (null/undefined) so the UI shows a consistent
 * em-dash in muted slate instead of one page rendering "—", another
 * rendering nothing, and a third rendering "none".
 */
export function Dash({ label = "—" }: { label?: string }) {
  return (
    <span aria-label="no value" className="text-slate-500">
      {label}
    </span>
  );
}
