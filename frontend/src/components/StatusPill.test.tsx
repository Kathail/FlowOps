import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./StatusPill";

describe("StatusPill", () => {
  it("renders children", () => {
    render(<StatusPill>open</StatusPill>);
    expect(screen.getByText("open")).toBeInTheDocument();
  });

  it.each([
    ["neutral", "bg-slate-500/15"],
    ["info", "bg-blue-500/15"],
    ["success", "bg-emerald-500/15"],
    ["warning", "bg-amber-500/15"],
    ["danger", "bg-red-500/15"],
    ["muted", "bg-slate-700/30"],
  ] as const)("tone=%s applies %s", (tone, klass) => {
    render(<StatusPill tone={tone}>x</StatusPill>);
    expect(screen.getByText("x")).toHaveClass(klass);
  });

  it("renders a leading dot when dot=true (colorblind-friendly cue)", () => {
    const { container } = render(
      <StatusPill tone="success" dot>
        pass
      </StatusPill>,
    );
    // The dot is the inner span with `bg-current rounded-full` classes
    expect(container.querySelector(".rounded-full")).toBeInTheDocument();
  });

  it("omits the dot by default", () => {
    const { container } = render(<StatusPill>x</StatusPill>);
    expect(container.querySelector(".rounded-full")).toBeNull();
  });

  it("merges caller className", () => {
    render(<StatusPill className="ml-2">x</StatusPill>);
    expect(screen.getByText("x")).toHaveClass("ml-2");
  });
});
