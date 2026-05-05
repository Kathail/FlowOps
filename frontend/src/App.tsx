import { useEffect, useState } from "react";

type HealthState =
  | { status: "loading" }
  | { status: "ok"; db: string; version: string }
  | { status: "error"; message: string };

export function App() {
  const [health, setHealth] = useState<HealthState>({ status: "loading" });

  useEffect(() => {
    fetch("/healthz")
      .then(async (res) => {
        const data = (await res.json()) as { db: string; version: string };
        setHealth({ status: "ok", db: data.db, version: data.version });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "unknown error";
        setHealth({ status: "error", message });
      });
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">FlowOps</h1>
        <p className="mt-2 text-sm text-slate-600">Sprint 0 — health check</p>
        <pre className="mt-4 rounded bg-slate-100 p-3 text-sm text-slate-800">
          {JSON.stringify(health, null, 2)}
        </pre>
      </div>
    </main>
  );
}
