import { useEffect } from "react";

/**
 * Browser-level guard: warns the user before unloading the tab
 * (refresh / close / navigate to another origin) when `dirty` is true.
 *
 * Pairs with `<UnsavedChangesGuard>` (from `components/UnsavedChangesGuard`)
 * which adds the in-app nav block via `useBlocker`. Use this hook
 * directly only if you need the tab-close guard without the in-app
 * dialog (rare).
 */
export function useUnsavedChangesWarning(dirty: boolean): void {
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      // Modern browsers ignore the message text but require returnValue
      // to be set to trigger the prompt at all.
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
