import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../lib/apiClient";
import { translateApiError } from "../../lib/translateApiError";
import { Logo } from "../../components/Logo";
import { login } from "./api";
import { ME_QUERY_KEY } from "./useAuth";

/**
 * Auto-login landing page for the public "Try the demo" CTA.
 *
 * Marketing site links here directly (citywater.ca → app.citywater.ca/demo)
 * so visitors skip the regular sign-in form. We POST the canned demo
 * credentials, navigate into the seeded tenant on success, and surface
 * a clear error + retry path on failure.
 *
 * Implementation note: we drive the login imperatively with a Ref
 * guarding against React 18 StrictMode double-invocation rather than
 * useMutation. useMutation gave us a stale-closure foot-gun where the
 * second StrictMode mount could swallow the first mount's pending
 * mutation, leaving the spinner stuck.
 */

const DEMO_LOGIN = {
  tenant_slug: "demo",
  email: "admin@demo.citywater.io",
  password: "DemoPassword123!",
};

type Phase =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done" };

export function DemoLoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [retryToken, setRetryToken] = useState(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const data = await login(DEMO_LOGIN);
        if (cancelled) return;
        queryClient.setQueryData(ME_QUERY_KEY, data);
        setPhase({ kind: "done" });
        navigate(`/${data.tenant.slug}/`, { replace: true });
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof ApiError && err.code === "bad_credentials"
            ? "Demo tenant isn't seeded yet. Reach out and we'll fix it."
            : translateApiError(err as Error);
        setPhase({ kind: "error", message });
      } finally {
        inFlightRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, queryClient, retryToken]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl shadow-blue-500/5 sm:p-8">
        <div className="flex flex-col items-center gap-3">
          <Logo size={56} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
              CityWater
            </p>
            <h1 className="text-xl font-semibold text-slate-100">
              {phase.kind === "error" ? "Couldn't load the demo" : "Loading the demo…"}
            </h1>
          </div>
        </div>

        {phase.kind !== "error" ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Signing you into a sandbox tenant pre-loaded with 12 months of simulated work.
            </p>
            <div
              role="status"
              aria-label="Loading"
              className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400"
            />
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {phase.message}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setPhase({ kind: "loading" });
                  setRetryToken((n) => n + 1);
                }}
                className="flex-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20"
              >
                Try again
              </button>
              <Link
                to="/login"
                className="flex-1 rounded-md border border-slate-700 bg-slate-800/40 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
              >
                Sign in instead
              </Link>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Questions?{" "}
          <a
            href="mailto:contact@citywater.ca"
            className="text-blue-400 hover:text-blue-300 hover:underline"
          >
            contact@citywater.ca
          </a>
        </p>
      </div>
    </main>
  );
}
