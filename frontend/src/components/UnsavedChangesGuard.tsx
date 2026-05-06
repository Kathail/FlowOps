import { useBlocker } from "react-router-dom";
import { useUnsavedChangesWarning } from "../lib/useUnsavedChangesWarning";
import { ConfirmDialog } from "./ConfirmDialog";

/**
 * Mount this anywhere on a page that holds dirty form state. It
 * combines two guards into one component so callers don't have to
 * stitch them together:
 *
 *   1. Tab-close / refresh / cross-origin nav: `beforeunload` listener
 *      (via `useUnsavedChangesWarning`). The browser's prompt is the UI.
 *   2. In-app navigation (`<Link>` clicks, `navigate()` calls,
 *      back-button): React Router's `useBlocker`. We render a
 *      `<ConfirmDialog>` and let the user discard or cancel.
 *
 * Requires the data router (`createBrowserRouter` / `RouterProvider`)
 * — `useBlocker` no-ops under the legacy `<BrowserRouter>`.
 */

interface Props {
  dirty: boolean;
  /** Override the dialog title. */
  title?: string;
  /** Override the dialog body. */
  message?: string;
  /** Override the confirm-button label. */
  confirmLabel?: string;
}

export function UnsavedChangesGuard({
  dirty,
  title = "Discard unsaved changes?",
  message = "You have edits that haven't been saved. Leave this page and lose them?",
  confirmLabel = "Discard changes",
}: Props) {
  useUnsavedChangesWarning(dirty);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  if (blocker.state !== "blocked") return null;

  return (
    <ConfirmDialog
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      onConfirm={() => blocker.proceed()}
      onCancel={() => blocker.reset()}
    />
  );
}
