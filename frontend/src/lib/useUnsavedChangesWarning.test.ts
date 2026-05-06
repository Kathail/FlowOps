import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

describe("useUnsavedChangesWarning", () => {
  let addSpy: ReturnType<typeof vi.fn>;
  let removeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    addSpy = vi.spyOn(window, "addEventListener") as unknown as ReturnType<typeof vi.fn>;
    removeSpy = vi.spyOn(window, "removeEventListener") as unknown as ReturnType<typeof vi.fn>;
  });

  afterEach(() => {
    (addSpy as unknown as { mockRestore: () => void }).mockRestore();
    (removeSpy as unknown as { mockRestore: () => void }).mockRestore();
  });

  it("does NOT register a beforeunload listener when not dirty", () => {
    renderHook(() => useUnsavedChangesWarning(false));
    const calls = addSpy.mock.calls.filter(([ev]) => ev === "beforeunload");
    expect(calls).toHaveLength(0);
  });

  it("registers + unregisters a beforeunload listener when dirty", () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));
    const adds = addSpy.mock.calls.filter(([ev]) => ev === "beforeunload");
    expect(adds).toHaveLength(1);
    unmount();
    const removes = removeSpy.mock.calls.filter(([ev]) => ev === "beforeunload");
    expect(removes).toHaveLength(1);
  });

  it("registered handler sets returnValue and calls preventDefault on the event", () => {
    renderHook(() => useUnsavedChangesWarning(true));
    const handler = addSpy.mock.calls.find(([ev]) => ev === "beforeunload")?.[1] as
      | EventListener
      | undefined;
    expect(handler).toBeDefined();
    const fakeEvent = {
      preventDefault: vi.fn(),
      returnValue: undefined as unknown as string,
    } as unknown as BeforeUnloadEvent;
    handler!(fakeEvent);
    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(fakeEvent.returnValue).toBe("");
  });
});
