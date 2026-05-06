import { Link } from "react-router-dom";
import { useAuth } from "./useAuth";

const QUICK_LINKS: { to: (slug: string) => string; label: string; hint: string }[] = [
  { to: (s) => `/${s}/map`, label: "Map", hint: "Spatial view of every asset class" },
  { to: (s) => `/${s}/assets`, label: "Assets", hint: "List, filter, and import" },
  { to: (s) => `/${s}/work-orders`, label: "Work orders", hint: "Open, assigned, in-progress" },
  { to: (s) => `/${s}/inspections`, label: "Inspections", hint: "Hydrant, valve, MH, CCTV" },
  { to: (s) => `/${s}/service-requests`, label: "Service requests", hint: "Intake → triage → dispatch" },
  { to: (s) => `/${s}/reports`, label: "Reports", hint: "5 canned reports, JSON / CSV / PDF" },
];

export function TenantHomePage() {
  const { user, tenant } = useAuth();
  if (!user || !tenant) return null;

  return (
    <div className="p-8 max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-100">
          Welcome, {user.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Signed in to <span className="text-slate-200">{tenant.name}</span>{" "}
          <span className="text-blue-400">/{tenant.slug}</span>
        </p>
      </header>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Jump to
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.label}
              to={link.to(tenant.slug)}
              className="surface group p-4 transition-colors hover:border-blue-500/50 hover:bg-slate-900/80"
            >
              <p className="text-sm font-medium text-slate-100 group-hover:text-blue-300">
                {link.label}
                <span className="ml-1 text-blue-400 transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-400">{link.hint}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Your roles
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {user.roles.map((r) => (
            <li
              key={r.code}
              className="rounded bg-blue-500/15 px-2 py-0.5 text-xs text-blue-200 ring-1 ring-blue-500/30"
            >
              {r.name}
            </li>
          ))}
          {user.roles.length === 0 && (
            <li className="text-xs text-slate-400">No roles assigned.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
