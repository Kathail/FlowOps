import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading, isFetched, error } = useAuth();

  if (isLoading || !isFetched) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>
    );
  }

  if (error || !user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
