import { Dashboard } from "../dashboard/Dashboard";
import { useAuth } from "./useAuth";

/**
 * Landing page for `/{slug}/`. Thin wrapper — the substantive
 * dashboard composition lives in `features/dashboard/Dashboard.tsx`
 * with subcomponents in the same directory.
 */
export function TenantHomePage() {
  const { user, tenant } = useAuth();
  if (!user || !tenant) return null;
  return <Dashboard user={user} tenant={tenant} />;
}
