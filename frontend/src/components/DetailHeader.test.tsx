import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DetailHeader } from "./DetailHeader";

function renderHeader(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("DetailHeader", () => {
  it("renders title, back link, and forwards the back href", () => {
    renderHeader(<DetailHeader backTo="/acme/assets" backLabel="Back to assets" title="HYD-001" />);
    expect(screen.getByRole("heading", { name: "HYD-001" }).tagName).toBe("H1");
    const back = screen.getByRole("link", { name: /Back to assets/ });
    expect(back).toHaveAttribute("href", "/acme/assets");
  });

  it("renders subtitle, trailing, and meta only when supplied", () => {
    renderHeader(
      <DetailHeader
        backTo="/x"
        backLabel="Back"
        title="T"
        subtitle="hydrant · water"
        trailing={<span>status</span>}
        meta={<span data-testid="meta">chips</span>}
      />,
    );
    expect(screen.getByText("hydrant · water")).toBeInTheDocument();
    expect(screen.getByText("status")).toBeInTheDocument();
    expect(screen.getByTestId("meta")).toBeInTheDocument();
  });

  it("omits subtitle / trailing / meta nodes when not supplied", () => {
    const { container } = renderHeader(<DetailHeader backTo="/x" backLabel="Back" title="T" />);
    expect(container.querySelectorAll("p")).toHaveLength(0);
  });
});
