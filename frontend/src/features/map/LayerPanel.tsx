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
  serviceAreas?: GeoJSON.Feature<
    GeoJSON.MultiPolygon | GeoJSON.Polygon,
    ServiceAreaFeatureProps
  >[];
  areaKindsVisible?: Set<string>;
  onToggleAreaKind?: (kind: string, on: boolean) => void;
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
}: Props) {
  const areasByKind = serviceAreas.reduce<
    Record<string, GeoJSON.Feature<GeoJSON.MultiPolygon | GeoJSON.Polygon, ServiceAreaFeatureProps>[]>
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
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-900 p-4 overflow-y-auto">
      <section aria-labelledby="basemap-heading" className="mb-4">
        <h2 id="basemap-heading" className="text-xs font-medium uppercase text-slate-400">
          Basemap
        </h2>
        <select
          value={basemap}
          onChange={(e) => onBasemapChange(e.target.value as BasemapId)}
          className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
          aria-label="Basemap"
        >
          {BASEMAP_OPTIONS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </section>

      <section aria-labelledby="ops-heading" className="mb-4">
        <h2 id="ops-heading" className="text-xs font-medium uppercase text-slate-400 mb-1">
          Operational
        </h2>
        <ul className="space-y-1">
          <li>
            <label className="flex items-center gap-2 cursor-pointer text-sm hover:bg-slate-800/50 rounded px-1 py-0.5">
              <input
                type="checkbox"
                checked={showWos}
                onChange={(e) => onToggleWos?.(e.target.checked)}
                aria-label="Toggle open work orders"
              />
              <span
                className="inline-block h-3 w-3 rounded-full border-2 border-blue-400"
                aria-hidden="true"
              />
              <span className="text-slate-200">Open work orders</span>
              <span className="ml-auto text-xs tabular-nums text-slate-400">
                {woCount}
              </span>
            </label>
          </li>
          <li>
            <label className="flex items-center gap-2 cursor-pointer text-sm hover:bg-slate-800/50 rounded px-1 py-0.5">
              <input
                type="checkbox"
                checked={showSrs}
                onChange={(e) => onToggleSrs?.(e.target.checked)}
                aria-label="Toggle active service requests"
              />
              <span
                className="inline-block h-3 w-3 rounded-full bg-amber-500"
                aria-hidden="true"
              />
              <span className="text-slate-200">Active service requests</span>
              <span className="ml-auto text-xs tabular-nums text-slate-400">
                {srCount}
              </span>
            </label>
          </li>
        </ul>
      </section>

      {Object.keys(areasByKind).length > 0 && areaKindsVisible !== undefined && (
        <section aria-labelledby="areas-heading" className="mb-4">
          <h2 id="areas-heading" className="text-xs font-medium uppercase text-slate-400 mb-1">
            Service areas
          </h2>
          <ul className="space-y-1">
            {Object.entries(areasByKind).map(([kind, features]) => {
              const checked = areaKindsVisible.has(kind);
              const sample = features[0]?.properties.color ?? "#475569";
              return (
                <li key={kind}>
                  <label className="flex items-center gap-2 cursor-pointer text-sm hover:bg-slate-800/50 rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => onToggleAreaKind?.(kind, e.target.checked)}
                      aria-label={`Toggle ${AREA_KIND_LABELS[kind] ?? kind}`}
                    />
                    <span
                      className="inline-block h-3 w-3 rounded-sm border-2 border-dashed"
                      style={{ borderColor: sample, backgroundColor: `${sample}33` }}
                      aria-hidden="true"
                    />
                    <span className="text-slate-200">
                      {AREA_KIND_LABELS[kind] ?? kind}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-slate-400">
                      {features.length}
                    </span>
                  </label>
                  {checked && features.length > 1 && (
                    <ul className="ml-6 mt-0.5 space-y-0.5">
                      {features.map((f) => (
                        <li
                          key={f.properties.id}
                          className="flex items-center gap-1.5 text-[11px] text-slate-400"
                        >
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: f.properties.color ?? "#475569" }}
                          />
                          {f.properties.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {domains.map((d) => {
        const ls = byDomain[d.id] ?? [];
        if (ls.length === 0) return null;
        return (
          <section key={d.id} aria-labelledby={`heading-${d.id}`} className="mb-4">
            <h2
              id={`heading-${d.id}`}
              className="text-xs font-medium uppercase text-slate-400 mb-1"
            >
              {d.label}
            </h2>
            <ul className="space-y-1">
              {ls.map((l) => {
                const checked = visibleClasses.has(l.class_code);
                return (
                  <li key={l.class_code}>
                    <label className="flex items-center gap-2 cursor-pointer text-sm hover:bg-slate-800/50 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onToggle(l.class_code, e.target.checked)}
                        aria-label={`Toggle ${l.name}`}
                      />
                      <span
                        className="inline-block h-3 w-3 rounded-sm border border-slate-700"
                        style={{ backgroundColor: l.color ?? "#888" }}
                        aria-hidden="true"
                      />
                      <span className="text-slate-200">{l.name}</span>
                      <span className="ml-auto text-xs text-slate-400 font-mono">
                        {l.class_code}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </aside>
  );
}
