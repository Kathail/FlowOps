import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `useBlocker` requires the data router; running it through
 * `createMemoryRouter` in jsdom hits a node-undici / jsdom AbortSignal
 * realm mismatch on every actual navigation. So we mock `useBlocker`
 * here and test what we actually care about: that the component shows
 * the dialog when blocked, and that confirm/cancel reach the right
 * blocker callbacks.
 *
 * The hook → component contract is a stable react-router-dom API; the
 * component's behaviour around it is what's project-owned.
 */

type Blocker =
  | { state: "unblocked" | "proceeding" }
  | { state: "blocked"; proceed: () => void; reset: () => void };

let mockBlocker: Blocker = { state: "unblocked" };
// Hook signature is (predicate) => blocker. Tests reach into
// `useBlockerSpy.mock.calls.at(-1)?.[0]` to assert the registered
// predicate behaves correctly.
const useBlockerSpy = vi.fn((_shouldBlock: () => boolean) => mockBlocker);

vi.mock("react-router-dom", () => ({
  useBlocker: (fn: Parameters<typeof useBlockerSpy>[0]) => useBlockerSpy(fn),
}));

import { UnsavedChangesGuard } from "./UnsavedChangesGuard";

afterEach(() => {
  mockBlocker = { state: "unblocked" };
  useBlockerSpy.mockClear();
});

describe("UnsavedChangesGuard", () => {
  it("renders nothing when not blocked, regardless of dirty", () => {
    const { container, rerender } = render(<UnsavedChangesGuard dirty={false} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<UnsavedChangesGuard dirty={true} />);
    // Mock blocker is still "unblocked", so still nothing renders
    expect(container).toBeEmptyDOMElement();
  });

  it("registers a blocker predicate that only fires when dirty", () => {
    render(<UnsavedChangesGuard dirty={false} />);
    const predicate = useBlockerSpy.mock.calls.at(-1)?.[0] as (arg: {
      currentLocation: { pathname: string };
      nextLocation: { pathname: string };
    }) => boolean;
    expect(
      predicate({
        currentLocation: { pathname: "/a" },
        nextLocation: { pathname: "/b" },
      }),
    ).toBe(false);
  });

  it("registered predicate returns true when dirty AND nav is cross-path", () => {
    render(<UnsavedChangesGuard dirty={true} />);
    const predicate = useBlockerSpy.mock.calls.at(-1)?.[0] as (arg: {
      currentLocation: { pathname: string };
      nextLocation: { pathname: string };
    }) => boolean;
    expect(
      predicate({
        currentLocation: { pathname: "/a" },
        nextLocation: { pathname: "/b" },
      }),
    ).toBe(true);
    // Same-path nav (e.g. query-string change) shouldn't block.
    expect(
      predicate({
        currentLocation: { pathname: "/a" },
        nextLocation: { pathname: "/a" },
      }),
    ).toBe(false);
  });

  it("renders the confirm dialog when blocker.state === 'blocked'", () => {
    mockBlocker = { state: "blocked", proceed: vi.fn(), reset: vi.fn() };
    render(<UnsavedChangesGuard dirty={true} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Discard unsaved changes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Discard changes/ })).toBeInTheDocument();
  });

  it("clicking Discard calls blocker.proceed()", async () => {
    const proceed = vi.fn();
    const reset = vi.fn();
    mockBlocker = { state: "blocked", proceed, reset };
    render(<UnsavedChangesGuard dirty={true} />);
    await userEvent.click(screen.getByRole("button", { name: /Discard changes/ }));
    expect(proceed).toHaveBeenCalledOnce();
    expect(reset).not.toHaveBeenCalled();
  });

  it("clicking Cancel calls blocker.reset()", async () => {
    const proceed = vi.fn();
    const reset = vi.fn();
    mockBlocker = { state: "blocked", proceed, reset };
    render(<UnsavedChangesGuard dirty={true} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(reset).toHaveBeenCalledOnce();
    expect(proceed).not.toHaveBeenCalled();
  });

  it("supports custom title / message / confirmLabel", () => {
    mockBlocker = { state: "blocked", proceed: vi.fn(), reset: vi.fn() };
    render(
      <UnsavedChangesGuard
        dirty
        title="Leave inspection?"
        message="Your draft will be discarded."
        confirmLabel="Leave anyway"
      />,
    );
    expect(screen.getByText("Leave inspection?")).toBeInTheDocument();
    expect(screen.getByText("Your draft will be discarded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Leave anyway" })).toBeInTheDocument();
  });
});
