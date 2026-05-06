import { useEffect } from "react";

/**
 * Browser-level guard: warns the user before unloading the tab
 * (refresh / close / navigate to another origin) when `dirty` is true.
 *
 * NOTE: this does NOT intercept in-app navigation (clicking a
 * react-router `<Link>`). Doing so requires the data router
 * (`createBrowserRouter` + `useBlocker`); the app currently uses the
 * component-router (`<BrowserRouter>`). When the router is migrated,
 * upgrade this hook to also block in-app nav. Until then, the
 * beforeunload guard at least catches the most damaging case
 * (accidental tab close / refresh).
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
