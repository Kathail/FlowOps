import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { translateApiError } from "../../lib/translateApiError";
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
    onError: (err) => setErrorMessage(translateApiError(err)),
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
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-blue-500/5 space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Register a tenant</h1>
          <p className="mt-1 text-sm text-slate-400">
            You'll be the first administrator of this organization.
          </p>
        </div>
        <label className="block">
          <span className="text-sm text-slate-300">Organization name</span>
          <input className="input mt-1" {...field("tenant_name")} required />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Slug (lowercase URL identifier)</span>
          <input
            className="input mt-1"
            pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
            placeholder="acme-water"
            {...field("slug")}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Your name</span>
          <input className="input mt-1" {...field("full_name")} required />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Email</span>
          <input type="email" className="input mt-1" {...field("admin_email")} required />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Password (12+ characters)</span>
          <input
            type="password"
            minLength={12}
            className="input mt-1"
            {...field("admin_password")}
            required
          />
        </label>
        {errorMessage && <Alert>{errorMessage}</Alert>}
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending ? "Creating…" : "Create tenant"}
        </Button>
        <p className="text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
