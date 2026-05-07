import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { logout } from "../features/auth/api";
import { useAuth } from "../features/auth/useAuth";
import { ConflictDrawer } from "./ConflictDrawer";
import { DemoBanner } from "./DemoBanner";
import { Logo } from "./Logo";
import { OfflineBanner } from "./OfflineBanner";

/**
 * App shell for an authenticated tenant.
 *
 * Responsive layout:
 *  - ≥ md (768px): fixed left sidebar (224px) + outlet column.
 *  - < md: top bar with hamburger + logo; nav slides in as a sheet
 *    from the left over a backdrop. Closing on Esc, on backdrop tap,
 *    and on every route change so a tap-to-navigate doesn't leave
 *    the drawer open over the page.
 */
export function TenantShell() {
  const { user, tenant } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear *every* query so signing into a different tenant doesn't
      // briefly show stale data from the previous one.
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  // Close the mobile drawer whenever the route changes — otherwise a
  // tap on a nav link leaves the sheet hovering over the new page.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  // Esc closes the drawer.
  useEffect(() => {
    if (!navOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  if (!user || !tenant) return null;

  const slug = tenant.slug;
  const isDemo = tenant.slug === "demo";

  // If the URL slug doesn't match the session tenant, redirect to the
  // session's tenant home rather than rendering chrome that lies about
  // the active tenant. CLAUDE.md: tenant scope is derived from the
  // authenticated session, never the URL.
  const urlSlug = (params as { slug?: string }).slug;
  if (urlSlug && urlSlug !== slug) {
    return <Navigate to={`/${slug}/`} replace />;
  }
  const isAdmin = user.roles.some((r) => r.code === "admin");

  const navLink = (to: string, label: string) => (
    <NavLink
      to={to}
      end={to === `/${slug}/`}
      className={({ isActive }) =>
        `block rounded px-3 py-2 text-sm transition-colors ${
          isActive
            ? "bg-blue-500/15 text-blue-200 ring-1 ring-blue-500/30"
            : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
        }`
      }
    >
      {label}
    </NavLink>
  );

  // Sidebar body — the same content is mounted in two places (mobile
  // drawer + desktop fixed sidebar) so we extract it.
  const sidebarBody = (
    <>
      <Link
        to={`/${slug}/`}
        className="mb-6 flex items-center gap-2.5"
        title={tenant.name}
      >
        <Logo size={32} className="shrink-0" />
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-slate-100 leading-tight line-clamp-2 break-words">
            {tenant.name}
          </h1>
          <p className="text-xs text-blue-400">/{slug}</p>
        </div>
      </Link>
      <nav className="flex flex-col gap-1">
        {navLink(`/${slug}/`, "Home")}
        {navLink(`/${slug}/map`, "Map")}
        {navLink(`/${slug}/assets`, "Assets")}
        {navLink(`/${slug}/work-orders`, "Work orders")}
        {navLink(`/${slug}/inspections`, "Inspections")}
        {navLink(`/${slug}/service-requests`, "Service requests")}
        {navLink(`/${slug}/schedules`, "Schedules")}
        {navLink(`/${slug}/reports`, "Reports")}
        {isAdmin && navLink(`/${slug}/admin`, "Admin")}
      </nav>
      <div className="mt-auto pt-4 border-t border-slate-800">
        <p className="text-xs text-slate-300">{user.full_name}</p>
        <p className="text-xs text-slate-400 truncate">{user.email}</p>
        <button
          onClick={() => signOut.mutate()}
          disabled={signOut.isPending}
          className="mt-2 w-full rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50"
        >
          {signOut.isPending ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {isDemo && <DemoBanner />}

      {/* Mobile top bar — only visible below md breakpoint. */}
      <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Open navigation"
          aria-expanded={navOpen}
          className="rounded p-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Link to={`/${slug}/`} className="flex min-w-0 items-center gap-2">
          <Logo size={26} className="shrink-0" />
          <span className="truncate text-sm font-semibold text-slate-100">{tenant.name}</span>
        </Link>
        <div className="w-8" aria-hidden="true" />
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900 p-4 md:flex">
          {sidebarBody}
        </aside>

        {/* Mobile drawer */}
        {navOpen && (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setNavOpen(false)}
              aria-hidden="true"
            />
            <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-slate-800 bg-slate-900 p-4 shadow-2xl">
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                aria-label="Close navigation"
                className="mb-2 self-end rounded p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </svg>
              </button>
              {sidebarBody}
            </aside>
          </div>
        )}

        <main className="relative flex-1 overflow-auto bg-slate-950">
          <OfflineBanner onOpenConflicts={() => setConflictsOpen(true)} />
          <Outlet />
        </main>
      </div>

      {conflictsOpen && <ConflictDrawer onClose={() => setConflictsOpen(false)} />}
    </div>
  );
}
