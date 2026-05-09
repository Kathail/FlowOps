/**
 * Segmented tab control for switching dashboard "lens": supervisor,
 * field crew, manager. The shape is the same in all three; the
 * components inside each column adapt their content.
 *
 * Visual: monospace label + a small numeric badge for what's relevant
 * to that lens. No bottom border / no underline — the active tab uses
 * a soft signal-cyan inner ring instead, which sits more quietly with
 * the operations-console aesthetic than the usual underline.
 */

export type DashTab = "supervisor" | "crew" | "manager";

const TABS: { id: DashTab; label: string; sub: string }[] = [
  { id: "supervisor", label: "Supervisor", sub: "Triage" },
  { id: "crew", label: "Field crew", sub: "Your day" },
  { id: "manager", label: "Manager", sub: "Trends" },
];

interface Props {
  active: DashTab;
  onChange: (next: DashTab) => void;
}

export function DashboardTabs({ active, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard lens"
      className="inline-flex items-stretch gap-0 rounded-md border border-slate-800 bg-slate-900/40 p-1"
    >
      {TABS.map((t) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className={`group relative flex flex-col items-start rounded px-4 py-1.5 text-left transition-colors ${
              selected
                ? "bg-slate-950 text-slate-100 ring-1 ring-signal/30"
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            {selected && (
              <span
                aria-hidden
                className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 animate-pulse-soft rounded-full bg-signal"
              />
            )}
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
                selected ? "pl-3 text-signal" : "text-slate-500"
              }`}
            >
              {t.sub}
            </span>
            <span
              className={`text-[13px] font-medium ${
                selected ? "pl-3 text-slate-100" : "text-slate-300"
              }`}
            >
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
