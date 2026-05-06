import { NavLink, Outlet, useParams } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const TABS = [
  { to: "users", label: "Users" },
  { to: "invitations", label: "Invitations" },
  { to: "tenant", label: "Tenant" },
  { to: "asset-classes", label: "Asset classes" },
];

export function AdminLayout() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();

  const isAdmin = user?.roles.some((r) => r.code === "admin") ?? false;

  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className="p-8 text-slate-700">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-sm">
          You need the <code className="rounded bg-slate-100 px-1">admin</code>{" "}
          role to access this section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-8">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="text-sm text-slate-500">
          Tenant settings, users, invitations, and the asset class catalog.
        </p>
      </header>
      <nav className="flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={`/${slug}/admin/${t.to}`}
            end
            className={({ isActive }) =>
              `border-b-2 px-3 py-2 text-sm ${
                isActive
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
