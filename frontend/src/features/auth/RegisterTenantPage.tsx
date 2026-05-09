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
    <main className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div aria-hidden className="dot-grid-bg" />
      <form
        onSubmit={onSubmit}
        className="relative z-10 w-full max-w-md console-panel space-y-4 p-6 shadow-2xl shadow-signal/5"
      >
        <div className="border-b border-dashed border-slate-800 pb-4">
          <p className="section-label-signal">CityWater</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-slate-100">
            Register a tenant
          </h1>
          <p className="mt-1 section-label">First administrator of the new organization</p>
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
          <Link to="/login" className="text-signal hover:text-cyan-100 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
