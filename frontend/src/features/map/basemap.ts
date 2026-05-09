export type BasemapId = "dark" | "osm" | "blank" | "satellite";

export const BASEMAP_OPTIONS: { id: BasemapId; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "osm", label: "Light" },
  { id: "satellite", label: "Satellite" },
  { id: "blank", label: "Blank" },
];

/** Default basemap for new visitors. Dark fits the operations-console
 * theme; the bright OSM still ships as "Light" for operators who want
 * street labels. Persisted in localStorage via usePersistedState, so
 * a returning user keeps whatever they last picked. */
export const DEFAULT_BASEMAP: BasemapId = "dark";
