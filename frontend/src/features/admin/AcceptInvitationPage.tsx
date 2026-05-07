import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../lib/apiClient";
import { acceptInvitation } from "./api";

export function AcceptInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<{
    tenant_slug: string | null;
    email: string;
  } | null>(null);

  const mutate = useMutation({
    mutationFn: () =>
      acceptInvitation({
        token: token ?? "",
        full_name: fullName,
        password,
      }),
    onSuccess: (resp) => {
      setAccepted({ tenant_slug: resp.tenant_slug, email: resp.email });
    },
    onError: (e) => setErrorMessage(e instanceof ApiError ? e.message : String(e)),
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300">
        <div className="surface max-w-md p-6 text-center">
          <p>Missing invitation token.</p>
          <Link to="/login" className="mt-2 inline-block text-sm text-blue-400 hover:underline">
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-6 text-center max-w-md w-full">
          <h1 className="text-xl font-semibold text-slate-100">You're in.</h1>
          <p className="mt-2 text-sm text-slate-300">
            Your CityWater account ({accepted.email}) is ready.
          </p>
          <button
            onClick={() => {
              if (accepted.tenant_slug) navigate(`/login?slug=${accepted.tenant_slug}`);
              else navigate("/login");
            }}
            className="btn-primary mt-4"
          >
            Continue to login
          </button>
        </div>
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    mutate.mutate();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="surface max-w-md w-full p-6 shadow-2xl shadow-blue-500/5">
        <h1 className="text-xl font-semibold text-slate-100">Accept your invitation</h1>
        <p className="mt-1 text-sm text-slate-400">
          Set your name and a password to finish creating your account.
        </p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3 text-sm">
          <label className="block">
            <span className="text-slate-300">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={1}
              className="input mt-1"
            />
          </label>
          <label className="block">
            <span className="text-slate-300">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={12}
              className="input mt-1"
            />
            <span className="mt-1 block text-xs text-slate-400">At least 12 characters.</span>
          </label>
          {errorMessage && (
            <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {errorMessage}
            </p>
          )}
          <button type="submit" disabled={mutate.isPending} className="btn-primary w-full">
            {mutate.isPending ? "Creating account…" : "Accept invitation"}
          </button>
        </form>
      </div>
    </div>
  );
}
