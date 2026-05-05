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
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-slate-900">Sign in to FlowOps</h1>
        <label className="block">
          <span className="text-sm text-slate-700">Company slug</span>
          <input
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            autoComplete="organization"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-700">Email</span>
          <input
            type="email"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-700">Password</span>
          <input
            type="password"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {errorMessage && (
          <p role="alert" className="text-sm text-red-600">
            {errorMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </button>
        <p className="text-sm text-slate-500">
          Need an account?{" "}
          <Link to="/register" className="text-slate-900 underline">
            Register a tenant
          </Link>
        </p>
      </form>
    </main>
  );
}
