import { Fragment } from "react";
import type { ServiceAreaFeatureProps, TileLayerDescriptor } from "./api";
import { BASEMAP_OPTIONS, type BasemapId } from "./basemap";

interface Props {
  layers: TileLayerDescriptor[];
  visibleClasses: Set<string>;
  onToggle: (classCode: string, visible: boolean) => void;
  basemap: BasemapId;
  onBasemapChange: (id: BasemapId) => void;
  showWos?: boolean;
  showSrs?: boolean;
  onToggleWos?: (v: boolean) => void;
  onToggleSrs?: (v: boolean) => void;
  woCount?: number;
  srCount?: number;
  serviceAreas?: GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, ServiceAreaFeatureProps>[];
  areaKindsVisible?: Set<string>;
  onToggleAreaKind?: (kind: string, on: boolean) => void;
  /** Whether the panel is open. On mobile it slides over the map when
   * open and is off-screen otherwise. On desktop it's a left rail
   * when open and slides off-screen when closed (the operator has a
   * "Layers" toggle button to bring it back). */
  open?: boolean;
  /** Called from the panel's close button (chevron on desktop, ✕ on
   * mobile) and from the backdrop tap on mobile. */
  onClose?: () => void;
}

export function LayerPanel({
  layers,
  visibleClasses,
  onToggle,
  basemap,
  onBasemapChange,
  showWos = true,
  showSrs = true,
  onToggleWos,
  onToggleSrs,
  woCount = 0,
  srCount = 0,
  serviceAreas = [],
  areaKindsVisible,
  onToggleAreaKind,
  open = true,
  onClose,
}: Props) {
  const areasByKind = serviceAreas.reduce<
    Record<
      string,
      GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, ServiceAreaFeatureProps>[]
    >
  >((acc, f) => {
    const k = f.properties.area_kind;
    (acc[k] ??= []).push(f);
    return acc;
  }, {});
  const AREA_KIND_LABELS: Record<string, string> = {
    maintenance: "Maintenance districts",
    water_system: "Water systems",
    sewer_system: "Wastewater systems",
    storm_system: "Storm drainage",
  };
  const byDomain = layers.reduce<Record<string, TileLayerDescriptor[]>>((acc, l) => {
    (acc[l.domain] ??= []).push(l);
    return acc;
  }, {});
  const domains: { id: string; label: string }[] = [
    { id: "water", label: "Water" },
    { id: "sewer", label: "Sewer" },
    { id: "storm", label: "Storm" },
  ];

  return (
    <>
      {/* Backdrop on mobile when the drawer is open. Desktop never
          renders this because the aside is in normal document flow
          when shown. (The aside also lays itself out as fixed on
          mobile via Tailwind responsive variants.) */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-slate-950/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        // Mobile (<md): always position fixed, slide in/out via
        //   translate-x; off-screen by default.
        // Desktop (>=md): same fixed/slide pattern, but the slot in
        //   the main flex row collapses to 0 width when closed so the
        //   map gets the full width back. We can't use display:none
        //   on the aside (would lose the slide animation), so we
        //   instead rely on translate-x-full + the parent grid not
        //   reserving space for it. The map area is rendered as a
        //   sibling that fills the remaining space.
        className={`w-72 shrink-0 border-r border-slate-800 bg-slate-950/80 backdrop-blur fixed inset-y-0 left-0 z-30 overflow-y-auto transition-transform duration-200 md:relative md:z-auto ${
          open ? "translate-x-0" : "-translate-x-full md:absolute md:w-0 md:border-r-0"
        }`}
        aria-hidden={!open}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide layers panel"
            className="absolute right-3 top-3 rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-signal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              {/* chevron-left — "tuck me away" affordance on desktop;
                  reads as a close button on mobile too. */}
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        {/* Sticky panel header — keeps the operator anchored in the
            "Layers" pane while scrolling through long class lists.
            Mirrors the section-eyebrow pattern from the dashboard. */}
        <header className="sticky top-0 z-10 border-b border-dashed border-slate-800 bg-slate-950/80 px-4 py-3 backdrop-blur">
          <p className="section-label-strong">Layers</p>
        </header>

        <Section title="Basemap">
          <select
            value={basemap}
            onChange={(e) => onBasemapChange(e.target.value as BasemapId)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100 focus:border-signal focus:outline-none"
            aria-label="Basemap"
          >
            {BASEMAP_OPTIONS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Section>

        <Section title="Operational">
          <ul className="space-y-0.5">
            <ToggleRow
              checked={showWos}
              onChange={(v) => onToggleWos?.(v)}
              label="Open work orders"
              count={woCount}
              ariaLabel="Toggle open work orders"
              swatch={
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full border-2 border-signal"
                />
              }
            />
            <ToggleRow
              checked={showSrs}
              onChange={(v) => onToggleSrs?.(v)}
              label="Active service requests"
              count={srCount}
              ariaLabel="Toggle active service requests"
              swatch={
                <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
              }
            />
          </ul>
        </Section>

        {Object.keys(areasByKind).length > 0 && areaKindsVisible !== undefined && (
          <Section title="Service areas">
            <ul className="space-y-0.5">
              {Object.entries(areasByKind).map(([kind, features]) => {
                const checked = areaKindsVisible.has(kind);
                const sample = features[0]?.properties.color ?? "#475569";
                // ToggleRow returns its own <li>, so don't wrap it in
                // another <li>. The nested "individual area names"
                // sub-list when checked is rendered as a sibling <li>
                // for valid HTML.
                return (
                  <Fragment key={kind}>
                    <ToggleRow
                      checked={checked}
                      onChange={(v) => onToggleAreaKind?.(kind, v)}
                      label={AREA_KIND_LABELS[kind] ?? kind}
                      count={features.length}
                      ariaLabel={`Toggle ${AREA_KIND_LABELS[kind] ?? kind}`}
                      swatch={
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-dashed"
                          style={{ borderColor: sample, backgroundColor: `${sample}33` }}
                        />
                      }
                    />
                    {checked && features.length > 1 && (
                      <li className="ml-6 mt-0.5 list-none border-l border-dashed border-slate-800 pl-3">
                        <ul className="space-y-0.5">
                          {features.map((f) => (
                            <li
                              key={f.properties.id}
                              className="flex items-center gap-1.5 text-[11px] text-slate-400"
                            >
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: f.properties.color ?? "#475569" }}
                              />
                              {f.properties.name}
                            </li>
                          ))}
                        </ul>
                      </li>
                    )}
                  </Fragment>
                );
              })}
            </ul>
          </Section>
        )}

        {domains.map((d) => {
          const ls = byDomain[d.id] ?? [];
          if (ls.length === 0) return null;
          const allOn = ls.every((l) => visibleClasses.has(l.class_code));
          const allOff = ls.every((l) => !visibleClasses.has(l.class_code));
          return (
            <Section
              key={d.id}
              title={d.label}
              trailing={
                <span className="flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                  <button
                    type="button"
                    onClick={() => ls.forEach((l) => onToggle(l.class_code, true))}
                    disabled={allOn}
                    aria-label={`Show all ${d.label} layers`}
                    className="text-slate-500 transition-colors hover:text-signal disabled:cursor-not-allowed disabled:text-slate-700 disabled:hover:text-slate-700"
                  >
                    All
                  </button>
                  <span className="text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={() => ls.forEach((l) => onToggle(l.class_code, false))}
                    disabled={allOff}
                    aria-label={`Hide all ${d.label} layers`}
                    className="text-slate-500 transition-colors hover:text-signal disabled:cursor-not-allowed disabled:text-slate-700 disabled:hover:text-slate-700"
                  >
                    None
                  </button>
                </span>
              }
            >
              <ul className="space-y-0.5">
                {ls.map((l) => {
                  const checked = visibleClasses.has(l.class_code);
                  return (
                    <ToggleRow
                      key={l.class_code}
                      checked={checked}
                      onChange={(v) => onToggle(l.class_code, v)}
                      label={l.name}
                      ariaLabel={`Toggle ${l.name}`}
                      swatch={
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-sm"
                          style={{ backgroundColor: l.color ?? "#888" }}
                        />
                      }
                      tail={
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-slate-500">
                          {l.class_code}
                        </span>
                      }
                    />
                  );
                })}
              </ul>
            </Section>
          );
        })}
      </aside>
    </>
  );
}

/**
 * Section frame — hairline-dotted rule + section-label heading +
 * optional trailing content (e.g. the All/None mini-toggles on
 * domain sections). Keeps the LayerPanel's grouping uniform with
 * the rest of the operations console.
 */
function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // aria-label so the section gets role="region" with an accessible
    // name. (A bare <section> has role="generic" without a label —
    // tests that look up groups by `getByRole("region", { name })`
    // depend on this.)
    <section
      aria-label={title}
      className="border-b border-dashed border-slate-800 px-4 py-3 last:border-b-0"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="section-label">{title}</h2>
        {trailing}
      </div>
      {children}
    </section>
  );
}

/**
 * Toggle row — checkbox + colour swatch + label + (count|tail) +
 * subtle hover/focus affordance. Replaces the half-dozen near-
 * duplicate `<label>`/`<input>` blocks the panel had.
 */
function ToggleRow({
  checked,
  onChange,
  label,
  count,
  ariaLabel,
  swatch,
  tail,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  count?: number;
  ariaLabel: string;
  swatch: React.ReactNode;
  tail?: React.ReactNode;
}) {
  return (
    <li>
      <label
        className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[13px] transition-colors hover:bg-slate-900 ${
          checked ? "text-slate-100" : "text-slate-400"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={ariaLabel}
          className="h-3.5 w-3.5 cursor-pointer accent-signal"
        />
        {swatch}
        <span className="truncate">{label}</span>
        {count !== undefined && (
          <span className="ml-auto font-mono text-[10px] tabular-nums text-slate-500">{count}</span>
        )}
        {tail}
      </label>
    </li>
  );
}
