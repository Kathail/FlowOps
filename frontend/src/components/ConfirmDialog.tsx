import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { Alert } from "./Alert";
import { Button, type ButtonVariant } from "./Button";

/**
 * Modal confirmation dialog. Replaces the native `window.confirm()`,
 * which is unstyled, non-mobile-friendly, and unable to surface
 * additional context.
 *
 * Renders into `document.body` via a portal so the dialog can be
 * triggered from anywhere in the tree (including inside a `<tr>`)
 * without producing invalid HTML or breaking stacking contexts.
 *
 * Open the dialog conditionally from the parent (`{open && <ConfirmDialog…/>}`)
 * — the component handles backdrop click + Escape to cancel and
 * autofocuses the cancel button by default (safer of the two actions).
 */

interface Props {
  title: string;
  message: ReactNode;
  /** Tone of the confirm action. `danger` is the default for destructive flows. */
  confirmVariant?: ButtonVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Optional inline error to surface from the calling mutation. */
  errorMessage?: string | null;
  /** Disables the confirm button while a mutation is in flight. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmVariant = "danger",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  errorMessage,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-md space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 id="confirm-dialog-title" className="text-lg font-semibold text-slate-100">
          {title}
        </h3>
        <div className="text-sm text-slate-300">{message}</div>
        {errorMessage && <Alert>{errorMessage}</Alert>}
        <div className="flex justify-end gap-2 pt-2">
          <Button ref={cancelRef} variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
