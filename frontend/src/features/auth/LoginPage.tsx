import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../lib/apiClient";
import { translateApiError } from "../../lib/translateApiError";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { Logo } from "../../components/Logo";
import { login, type AuthEnvelope } from "./api";
import { ME_QUERY_KEY } from "./useAuth";

// Demo tenant ships seeded by `flask seed-demo` and pre-loaded with 12
// months of simulated work via `flask simulate-year`. Anyone hitting the
// "Try the demo" button lands on the admin profile of this tenant — the
// data is sandbox content, no real customers.
const DEMO_LOGIN = {
  tenant_slug: "demo",
  email: "admin@demo.citywater.io",
  password: "DemoPassword123!",
};

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation<AuthEnvelope, Error>({
    mutationFn: () => login({ tenant_slug: tenantSlug, email, password }),
    onSuccess: (data) => {
      queryClient.setQueryData(ME_QUERY_KEY, data);
      navigate(`/${data.tenant.slug}/`, { replace: true });
    },
    onError: (err) => setErrorMessage(translateApiError(err)),
  });

  const demoMutation = useMutation<AuthEnvelope, Error>({
    mutationFn: () => login(DEMO_LOGIN),
    onSuccess: (data) => {
      queryClient.setQueryData(ME_QUERY_KEY, data);
      navigate(`/${data.tenant.slug}/`, { replace: true });
    },
    onError: (err) => {
      // Special-case the missing-seed scenario for the demo CTA — it's
      // operational guidance, not a generic auth failure.
      if (err instanceof ApiError && err.code === "bad_credentials") {
        setErrorMessage("Demo tenant isn't seeded. Run `flask seed-demo` then retry.");
        return;
      }
      setErrorMessage(translateApiError(err));
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    mutation.mutate();
  }

  function tryDemo() {
    setErrorMessage(null);
    demoMutation.mutate();
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div aria-hidden className="dot-grid-bg" />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md console-panel space-y-4 p-6 shadow-2xl shadow-signal/5"
      >
        <div className="flex items-center gap-3 border-b border-dashed border-slate-800 pb-4">
          <Logo size={40} />
          <div>
            <p className="section-label-signal">CityWater</p>
            <h1 className="text-xl font-semibold tracking-tight text-slate-100 leading-tight">
              Sign in
            </h1>
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-slate-300">Company slug</span>
          <input
            className="input mt-1"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            autoComplete="organization"
            placeholder="acme"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Email</span>
          <input
            type="email"
            className="input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {errorMessage && <Alert>{errorMessage}</Alert>}
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </Button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-800" />
          <span>or</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Demo button keeps a one-off emerald accent — it's a deliberate
            "try this" call-to-action that should read differently from the
            primary submit. */}
        <button
          type="button"
          onClick={tryDemo}
          disabled={demoMutation.isPending}
          className="w-full rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          {demoMutation.isPending ? "Loading demo…" : "Try the demo →"}
        </button>
        <p className="text-center text-xs text-slate-500">
          Sandbox tenant with 12 months of simulated work. No sign-up needed.
        </p>

        <p className="text-sm text-slate-400">
          Need an account?{" "}
          <Link to="/register" className="text-signal hover:text-cyan-100 hover:underline">
            Register a tenant
          </Link>
        </p>
      </form>
    </main>
  );
}
