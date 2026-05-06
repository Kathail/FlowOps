import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../lib/apiClient";
import { login, type AuthEnvelope } from "./api";
import { ME_QUERY_KEY } from "./useAuth";

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
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrorMessage(
          err.code === "bad_credentials" ? "Invalid tenant, email, or password." : err.message,
        );
      } else {
        setErrorMessage(err.message);
      }
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    mutation.mutate();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-blue-500/5 space-y-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            CityWater
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-100">Sign in</h1>
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
        {errorMessage && (
          <p role="alert" className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn-primary w-full"
        >
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm text-slate-400">
          Need an account?{" "}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 hover:underline">
            Register a tenant
          </Link>
        </p>
      </form>
    </main>
  );
}
