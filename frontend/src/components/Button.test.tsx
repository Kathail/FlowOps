import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("defaults to type=button to avoid accidental form submission", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("respects an explicit type override (e.g. submit)", () => {
    render(<Button type="submit">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "submit");
  });

  it.each([
    ["primary", "btn-primary"],
    ["secondary", "btn-secondary"],
    ["ghost", "btn-ghost"],
    ["danger", "btn-danger"],
  ] as const)("variant=%s applies %s utility", (variant, klass) => {
    render(<Button variant={variant}>x</Button>);
    expect(screen.getByRole("button")).toHaveClass(klass);
  });

  it("size=sm appends btn-sm; size=md does not", () => {
    const { rerender } = render(<Button size="sm">x</Button>);
    expect(screen.getByRole("button")).toHaveClass("btn-sm");
    rerender(<Button size="md">x</Button>);
    expect(screen.getByRole("button")).not.toHaveClass("btn-sm");
  });

  it("does not include `!important` escape hatch in any variant/size combo", () => {
    render(
      <Button size="sm" variant="danger">
        x
      </Button>,
    );
    const cls = screen.getByRole("button").className;
    expect(cls).not.toMatch(/!/);
  });

  it("merges caller className without dropping variant class", () => {
    render(<Button className="w-full">x</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("btn-primary");
    expect(btn).toHaveClass("w-full");
  });

  it("forwards refs", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>x</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>x</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables clicks when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        x
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});
