import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../lib/apiClient";
import { registerTenant, type AuthEnvelope } from "./api";
import { ME_QUERY_KEY } from "./useAuth";

export function RegisterTenantPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tenant_name: "",
    slug: "",
    admin_email: "",
    admin_password: "",
    full_name: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation<AuthEnvelope, Error>({
    mutationFn: () => registerTenant(form),
    onSuccess: (data) => {
      queryClient.setQueryData(ME_QUERY_KEY, data);
      navigate(`/${data.tenant.slug}/`, { replace: true });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setErrorMessage(err.code === "slug_taken" ? "That slug is already taken." : err.message);
      } else {
        setErrorMessage(err.message);
      }
    },
  });

  function field<K extends keyof typeof form>(key: K) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value })),
    };
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    mutation.mutate();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4"
      >
        <h1 className="text-xl font-semibold text-slate-900">Register a new tenant</h1>
        <label className="block">
          <span className="text-sm text-slate-700">Organization name</span>
          <input
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            {...field("tenant_name")}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-700">Slug (lowercase URL identifier)</span>
          <input
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
            {...field("slug")}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-700">Your name</span>
          <input
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            {...field("full_name")}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-700">Email</span>
          <input
            type="email"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            {...field("admin_email")}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-700">Password (12+ characters)</span>
          <input
            type="password"
            minLength={12}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
            {...field("admin_password")}
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
          {mutation.isPending ? "Creating…" : "Create tenant"}
        </button>
        <p className="text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-slate-900 underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
