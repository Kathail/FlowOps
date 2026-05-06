import { useEffect, useState } from "react";
import { formatDateTime } from "../lib/format";
import { type QueuedMutation, discardMutation, drainQueue, listMutations } from "../lib/offline";

interface Props {
  onClose: () => void;
}

export function ConflictDrawer({ onClose }: Props) {
  const [items, setItems] = useState<QueuedMutation[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function refresh() {
    const all = await listMutations();
    setItems(
      all.filter((m) => m.status === "conflict" || m.status === "failed" || m.status === "queued"),
    );
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function discard(id: number) {
    setBusyId(id);
    try {
      await discardMutation(id);
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function retry(_id: number) {
    setBusyId(_id);
    try {
      // The queue's drainQueue() only retries entries with status='queued'.
      // For now, retry from the conflict drawer kicks a full drain — pending
      // entries with status='queued' will go, and conflict entries surface
      // their state for the user to discard or wait for a new SW build.
      await drainQueue();
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />
      <aside className="w-full max-w-md overflow-auto border-l border-slate-800 bg-slate-900 text-slate-100 shadow-2xl shadow-blue-500/10">
        <header className="flex items-center justify-between border-b border-slate-800 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Offline queue</h2>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-blue-300 hover:underline"
          >
            Close
          </button>
        </header>
        <ul className="divide-y divide-slate-800">
          {items.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-400">
              Nothing pending. You're caught up.
            </li>
          )}
          {items.map((m) => (
            <li key={m.id} className="space-y-2 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400">
                  {m.method} {m.url}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-xs ring-1 ${
                    m.status === "conflict"
                      ? "bg-red-500/15 text-red-300 ring-red-500/30"
                      : m.status === "failed"
                        ? "bg-amber-500/15 text-amber-300 ring-amber-500/30"
                        : "bg-blue-500/15 text-blue-300 ring-blue-500/30"
                  }`}
                >
                  {m.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Enqueued {formatDateTime(new Date(m.enqueuedAt).toISOString())} · attempts:{" "}
                {m.attempts}
              </p>
              {m.errorStatus && (
                <p className="text-xs text-red-400">
                  Server returned {m.errorStatus}
                  {m.errorMessage ? `: ${m.errorMessage}` : ""}
                </p>
              )}
              <div className="flex gap-2">
                {m.id !== undefined && (
                  <>
                    <button
                      onClick={() => retry(m.id!)}
                      disabled={busyId === m.id}
                      className="btn-ghost px-2 py-1 text-xs"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => discard(m.id!)}
                      disabled={busyId === m.id}
                      className="btn-danger px-2 py-1 text-xs"
                    >
                      Discard
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
