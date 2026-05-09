import { useEffect, useState } from "react";
import { type QueueListener, drainQueue, queueCounts, subscribeQueue } from "../lib/offline/queue";

interface Props {
  onOpenConflicts: () => void;
}

export function OfflineBanner({ onOpenConflicts }: Props) {
  const [online, setOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [counts, setCounts] = useState({ queued: 0, conflict: 0, failed: 0 });
  const [draining, setDraining] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    void queueCounts().then(setCounts);
    const listener: QueueListener = (c) => setCounts(c);
    const unsub = subscribeQueue(listener);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      unsub();
    };
  }, []);

  const total = counts.queued + counts.conflict + counts.failed;
  if (online && total === 0) return null;

  async function syncNow() {
    setDraining(true);
    try {
      await drainQueue();
      setCounts(await queueCounts());
    } finally {
      setDraining(false);
    }
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm ${
        online
          ? "border-amber-500/20 bg-amber-500/5 text-amber-200"
          : "border-rose-500/20 bg-rose-500/5 text-rose-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-block h-2 w-2 animate-pulse rounded-full ${
            online ? "bg-amber-400" : "bg-rose-400"
          }`}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
          {online ? "Pending sync" : "Offline"}
          {counts.queued > 0 && ` · ${counts.queued} queued`}
          {counts.conflict > 0 &&
            ` · ${counts.conflict} conflict${counts.conflict === 1 ? "" : "s"}`}
          {counts.failed > 0 && ` · ${counts.failed} failed`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {counts.conflict + counts.failed > 0 && (
          <button onClick={onOpenConflicts} className="btn-ghost btn-sm">
            Review
          </button>
        )}
        {online && counts.queued > 0 && (
          <button onClick={syncNow} disabled={draining} className="btn-primary btn-sm">
            {draining ? "Syncing…" : "Sync now"}
          </button>
        )}
      </div>
    </div>
  );
}
