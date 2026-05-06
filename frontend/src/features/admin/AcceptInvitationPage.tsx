import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../lib/apiClient";
import { acceptInvitation } from "./api";

const inputClass =
  "mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm";

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
    onError: (e) =>
      setErrorMessage(e instanceof ApiError ? e.message : String(e)),
  });

  if (!token) {
    return (
      <div className="mx-auto mt-20 max-w-md p-6 text-center text-slate-700">
        <p>Missing invitation token.</p>
        <Link to="/login" className="mt-2 inline-block text-sm hover:underline">
          ← Back to login
        </Link>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="mx-auto mt-20 max-w-md rounded border border-emerald-200 bg-emerald-50 p-6 text-center">
        <h1 className="text-xl font-semibold text-emerald-900">
          You're in.
        </h1>
        <p className="mt-2 text-sm text-emerald-800">
          Your FlowOps account ({accepted.email}) is ready.
        </p>
        <button
          onClick={() => {
            if (accepted.tenant_slug)
              navigate(`/login?slug=${accepted.tenant_slug}`);
            else navigate("/login");
          }}
          className="mt-4 rounded bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Continue to login
        </button>
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    mutate.mutate();
  }

  return (
    <div className="mx-auto mt-20 max-w-md rounded border border-slate-200 bg-white p-6 shadow">
      <h1 className="text-xl font-semibold text-slate-900">
        Accept your invitation
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Set your name and a password to finish creating your account.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3 text-sm">
        <label className="block">
          <span className="text-slate-700">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={1}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            className={inputClass}
          />
          <span className="mt-1 block text-xs text-slate-500">
            At least 12 characters.
          </span>
        </label>
        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        <button
          type="submit"
          disabled={mutate.isPending}
          className="w-full rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {mutate.isPending ? "Creating account…" : "Accept invitation"}
        </button>
      </form>
    </div>
  );
}
