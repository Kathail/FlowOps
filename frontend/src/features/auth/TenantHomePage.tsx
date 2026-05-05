import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { logout } from "./api";
import { ME_QUERY_KEY, useAuth } from "./useAuth";

export function TenantHomePage() {
  const { user, tenant } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(ME_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: ME_QUERY_KEY });
      navigate("/login", { replace: true });
    },
  });

  if (!user || !tenant) return null;

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{tenant.name}</h1>
            <p className="text-sm text-slate-600">/{tenant.slug}</p>
          </div>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            {mutation.isPending ? "Signing out…" : "Sign out"}
          </button>
        </header>
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Signed in as
          </h2>
          <p className="mt-2 text-lg text-slate-900">{user.full_name}</p>
          <p className="text-sm text-slate-600">{user.email}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {user.roles.map((r) => (
              <li key={r.code} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {r.name}
              </li>
            ))}
          </ul>
        </section>
        <p className="text-xs text-slate-500">
          Sprint 1 placeholder. Asset list, work orders, and the map view land in S2+.
        </p>
      </div>
    </main>
  );
}
