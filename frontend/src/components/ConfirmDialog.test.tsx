import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

function setup(overrides: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      title="Delete asset HYD-001?"
      message="This will soft-delete the asset."
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("renders title, message, default labels and exposes a labelled dialog role", () => {
    setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "confirm-dialog-title");
    expect(screen.getByText("Delete asset HYD-001?")).toBeInTheDocument();
    expect(screen.getByText("This will soft-delete the asset.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("autofocuses the cancel button (safer of the two)", () => {
    setup();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("invokes onConfirm when the confirm button is clicked", async () => {
    const { onConfirm } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("invokes onCancel on Escape", async () => {
    const { onCancel } = setup();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("invokes onCancel when the backdrop is clicked", async () => {
    const { onCancel } = setup();
    await userEvent.click(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("does NOT close when the inner panel is clicked", async () => {
    const { onCancel } = setup();
    // Click on the title (inside the panel)
    await userEvent.click(screen.getByText("Delete asset HYD-001?"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("renders a custom confirm label and surfaces an error message", () => {
    setup({ confirmLabel: "Yes, deactivate", errorMessage: "Server unreachable." });
    expect(screen.getByRole("button", { name: "Yes, deactivate" })).toBeInTheDocument();
    expect(screen.getByText("Server unreachable.")).toBeInTheDocument();
  });

  it("disables both buttons + ignores Escape while busy", async () => {
    const { onCancel } = setup({ busy: true });
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Working/ })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
  });
});
