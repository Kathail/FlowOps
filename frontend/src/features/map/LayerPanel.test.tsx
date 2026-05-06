import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LayerPanel } from "./LayerPanel";
import type { TileLayerDescriptor } from "./api";

const FAKE_LAYERS: TileLayerDescriptor[] = [
  {
    id: "assets-wat-hyd",
    class_code: "WAT_HYD",
    domain: "water",
    name: "Hydrant",
    geometry_type: "Point",
    color: "#1e88e5",
    icon: null,
    source: "assets",
    source_layer: "assets",
    filter: ["==", ["get", "class_code"], "WAT_HYD"],
  },
  {
    id: "assets-san-mh",
    class_code: "SAN_MH",
    domain: "sewer",
    name: "Sanitary manhole",
    geometry_type: "Point",
    color: "#6d4c41",
    icon: null,
    source: "assets",
    source_layer: "assets",
    filter: ["==", ["get", "class_code"], "SAN_MH"],
  },
];

describe("LayerPanel", () => {
  it("groups by domain and shows the active classes as checked", () => {
    render(
      <LayerPanel
        layers={FAKE_LAYERS}
        visibleClasses={new Set(["WAT_HYD"])}
        onToggle={() => undefined}
        basemap="osm"
        onBasemapChange={() => undefined}
      />,
    );
    expect(screen.getByRole("region", { name: /water/i })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /sewer/i })).toBeInTheDocument();
    const hydToggle = screen.getByRole("checkbox", { name: /toggle hydrant/i });
    expect(hydToggle).toBeChecked();
    const mhToggle = screen.getByRole("checkbox", { name: /toggle sanitary manhole/i });
    expect(mhToggle).not.toBeChecked();
  });

  it("calls onToggle with the class_code and new state", async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel
        layers={FAKE_LAYERS}
        visibleClasses={new Set(["WAT_HYD"])}
        onToggle={onToggle}
        basemap="osm"
        onBasemapChange={() => undefined}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: /toggle hydrant/i }));
    expect(onToggle).toHaveBeenCalledWith("WAT_HYD", false);

    await userEvent.click(screen.getByRole("checkbox", { name: /toggle sanitary manhole/i }));
    expect(onToggle).toHaveBeenCalledWith("SAN_MH", true);
  });

  it("'All' toggles every layer in a domain on; 'None' toggles every layer off", async () => {
    const onToggle = vi.fn();
    // Two water layers so the per-domain action toggles more than one.
    const layers: TileLayerDescriptor[] = [
      ...FAKE_LAYERS,
      { ...FAKE_LAYERS[0], id: "assets-wat-val", class_code: "WAT_VAL", name: "Valve" },
    ];
    render(
      <LayerPanel
        layers={layers}
        visibleClasses={new Set()}
        onToggle={onToggle}
        basemap="osm"
        onBasemapChange={() => undefined}
      />,
    );

    // 'All' for water — both water layers should fire onToggle(_, true).
    await userEvent.click(screen.getByRole("button", { name: /Show all Water layers/i }));
    expect(onToggle).toHaveBeenCalledWith("WAT_HYD", true);
    expect(onToggle).toHaveBeenCalledWith("WAT_VAL", true);
    expect(onToggle).not.toHaveBeenCalledWith("SAN_MH", true);
  });

  it("disables 'All' when every layer in the domain is already on", () => {
    render(
      <LayerPanel
        layers={FAKE_LAYERS}
        visibleClasses={new Set(["WAT_HYD"])}
        onToggle={() => undefined}
        basemap="osm"
        onBasemapChange={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /Show all Water layers/i })).toBeDisabled();
    // Sewer has nothing on, so 'None' is the disabled one for that domain.
    expect(screen.getByRole("button", { name: /Hide all Sewer layers/i })).toBeDisabled();
  });

  it("changes basemap when select changes", async () => {
    const onBasemapChange = vi.fn();
    render(
      <LayerPanel
        layers={FAKE_LAYERS}
        visibleClasses={new Set()}
        onToggle={() => undefined}
        basemap="osm"
        onBasemapChange={onBasemapChange}
      />,
    );
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /basemap/i }), "blank");
    expect(onBasemapChange).toHaveBeenCalledWith("blank");
  });
});
