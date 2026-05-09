import { useEffect, useState } from "react";
import type { TenantOut, UserOut } from "../features/auth/api";

/**
 * Operations-console footer. Three zones in a single hairline-topped
 * row:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ user · tenant · role     · privacy · terms ·  © 2026 CityWater   │
 *   │                                              env · sha · ●health │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Mounted by TenantShell so every authenticated route gets it. The
 * health pulse polls `/healthz` every 30s and changes colour when the
 * backend stops responding — gives the operator a constant ambient
 * "is the system OK" signal without a dedicated page.
 */

interface Props {
  user: UserOut;
  tenant: TenantOut;
}

interface Healthz {
  db: "ok" | "error";
  version: string;
  environment: string;
}

export function AppFooter({ user, tenant }: Props) {
  const health = useHealthz();
  const year = new Date().getFullYear();
  const role = user.roles[0]?.code ?? "user";

  return (
    <footer
      role="contentinfo"
      className="border-t border-dashed border-slate-800 bg-slate-950/60 px-4 py-2"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em]">
        {/* Left — operator context. */}
        <div className="flex items-baseline gap-2 text-slate-500">
          <span className="text-slate-300">{user.full_name}</span>
          <span className="text-slate-700">·</span>
          <span>/{tenant.slug}</span>
          <span className="text-slate-700">·</span>
          <span>{role}</span>
        </div>

        {/* Center — legal. Marketing site footer mirrors this. */}
        <div className="flex items-baseline gap-3 text-slate-500">
          <a
            href="https://citywater.ca/privacy"
            className="hover:text-signal"
            rel="noreferrer noopener"
            target="_blank"
          >
            Privacy
          </a>
          <span className="text-slate-700">·</span>
          <a
            href="https://citywater.ca/terms"
            className="hover:text-signal"
            rel="noreferrer noopener"
            target="_blank"
          >
            Terms
          </a>
          <span className="text-slate-700">·</span>
          <span>© {year} CityWater</span>
        </div>

        {/* Right — build metadata + health pulse. */}
        <div className="flex items-baseline gap-2 text-slate-500">
          {health && (
            <>
              <span>{health.environment}</span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-400">{health.version}</span>
              <span className="text-slate-700">·</span>
            </>
          )}
          <HealthPulse status={health?.db ?? "loading"} />
        </div>
      </div>
    </footer>
  );
}

function HealthPulse({ status }: { status: "ok" | "error" | "loading" }) {
  const tone =
    status === "ok"
      ? "bg-signal text-signal"
      : status === "error"
        ? "bg-rose-500 text-rose-300"
        : "bg-slate-600 text-slate-500";
  const label = status === "ok" ? "Healthy" : status === "error" ? "Down" : "Probing";
  return (
    <span className="flex items-baseline gap-1.5">
      <span aria-hidden className={`inline-block h-1.5 w-1.5 animate-pulse-soft rounded-full ${tone.split(" ")[0]}`} />
      <span className={tone.split(" ")[1]}>{label}</span>
    </span>
  );
}

/**
 * Lightweight `/healthz` poller. 30s cadence — frequent enough that
 * a backend outage shows up within "I just noticed" time, infrequent
 * enough that idle tabs don't burn cycles. Falls silent on the first
 * fetch failure (status="error") rather than spamming retries.
 */
function useHealthz(): Healthz | null {
  const [data, setData] = useState<Healthz | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        // Same-origin via the SPA proxy. No credentials needed for /healthz.
        const r = await fetch("/healthz", { credentials: "omit" });
        if (cancelled) return;
        if (!r.ok) {
          // Backend reachable but unhealthy — keep version/env if we
          // already had them, flip db to error.
          setData((prev) => (prev ? { ...prev, db: "error" } : null));
          return;
        }
        const j = (await r.json()) as Healthz;
        if (cancelled) return;
        setData(j);
      } catch {
        if (cancelled) return;
        setData((prev) => (prev ? { ...prev, db: "error" } : null));
      }
    }
    void tick();
    const id = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
  return data;
}
