import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("renders children", () => {
    render(<Panel>body</Panel>);
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("renders a string title as an uppercase eyebrow heading", () => {
    render(<Panel title="Caller">body</Panel>);
    const heading = screen.getByRole("heading", { name: "Caller" });
    expect(heading.tagName).toBe("H2");
    expect(heading).toHaveClass("uppercase");
  });

  it("renders a ReactNode title verbatim (no h2 wrapping)", () => {
    render(<Panel title={<span data-testid="custom">Custom</span>}>body</Panel>);
    expect(screen.getByTestId("custom")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders trailing content alongside the title", () => {
    render(
      <Panel title="Activity" trailing={<button>Refresh</button>}>
        body
      </Panel>,
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("omits the title row entirely when neither title nor trailing is set", () => {
    const { container } = render(<Panel>body</Panel>);
    expect(container.querySelector("h2")).toBeNull();
  });

  it("merges caller className", () => {
    const { container } = render(<Panel className="mt-8">body</Panel>);
    expect(container.firstChild).toHaveClass("mt-8");
  });
});
