/**
 * Sticky top banner shown only when the active tenant is the public
 * demo. Communicates that this is sandbox data, surfaces a contact
 * email for follow-ups, and gives a one-click route back to the
 * marketing site.
 *
 * Mounted by TenantShell when `tenant.slug === "demo"`.
 */
export function DemoBanner() {
  return (
    <div
      role="region"
      aria-label="Demo environment notice"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-100"
    >
      <p className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300"
        >
          Demo
        </span>
        <span aria-hidden className="text-emerald-500/40">
          ·
        </span>
        <span className="text-emerald-200/90">
          Sandbox tenant pre-populated with simulated work. Changes are real but the data resets
          periodically.
        </span>
      </p>
      <p className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
        <span className="text-emerald-300/60">Questions</span>
        <a
          href="mailto:contact@citywater.ca"
          className="text-emerald-200 hover:text-emerald-100"
        >
          contact@citywater.ca
        </a>
        <span aria-hidden="true" className="text-emerald-500/40">
          ·
        </span>
        <a
          href="https://citywater.ca"
          className="text-emerald-200 hover:text-emerald-100"
        >
          ← citywater.ca
        </a>
      </p>
    </div>
  );
}
