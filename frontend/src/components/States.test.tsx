import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingState } from "./States";

describe("LoadingState", () => {
  it("renders the default label", () => {
    render(<LoadingState />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders a custom label", () => {
    render(<LoadingState label="Fetching assets…" />);
    expect(screen.getByText("Fetching assets…")).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("renders the message", () => {
    render(<ErrorState message="Network down." />);
    expect(screen.getByText("Network down.")).toBeInTheDocument();
  });

  it("does not render a retry button when no retry handler is supplied", () => {
    render(<ErrorState message="Network down." />);
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("renders + invokes the retry handler when supplied", async () => {
    const retry = vi.fn();
    render(<ErrorState message="Network down." retry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="No assets yet" />);
    expect(screen.getByText("No assets yet")).toBeInTheDocument();
  });

  it("renders the optional hint and action", () => {
    render(
      <EmptyState
        title="No assets yet"
        hint="Add one with the import dialog."
        action={<button>Import</button>}
      />,
    );
    expect(screen.getByText("Add one with the import dialog.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
  });

  it("omits the hint when not supplied", () => {
    const { container } = render(<EmptyState title="None" />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
