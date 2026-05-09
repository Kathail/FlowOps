import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("defaults to error variant with role=alert", () => {
    render(<Alert>boom</Alert>);
    const node = screen.getByRole("alert");
    expect(node).toHaveTextContent("boom");
    expect(node).toHaveClass("border-rose-500/30");
  });

  it("warning variant uses role=alert (assertive announcement)", () => {
    render(<Alert variant="warning">careful</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("careful");
  });

  it.each(["success", "info"] as const)(
    "%s variant uses role=status (polite announcement)",
    (variant) => {
      render(<Alert variant={variant}>hi</Alert>);
      expect(screen.getByRole("status")).toHaveTextContent("hi");
    },
  );

  it("respects an explicit role override", () => {
    render(
      <Alert variant="error" role="status">
        soft
      </Alert>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("soft");
  });

  it("merges caller className", () => {
    render(<Alert className="mt-4">x</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("mt-4");
  });

  // Operations-console palette: muted backgrounds, rose for error
  // (warmer than red), signal-cyan for info. See Alert.tsx VARIANT.
  it.each([
    ["error", "border-rose-500/30"],
    ["success", "border-emerald-500/30"],
    ["info", "border-signal/30"],
    ["warning", "border-amber-500/30"],
  ] as const)("variant=%s applies %s", (variant, klass) => {
    render(<Alert variant={variant}>x</Alert>);
    // role differs by variant — query by text instead.
    expect(screen.getByText("x")).toHaveClass(klass);
  });
});
