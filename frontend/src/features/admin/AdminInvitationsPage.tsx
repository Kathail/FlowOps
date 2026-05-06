import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ApiError } from "../../lib/apiClient";
import {
  type InvitationCreateInput,
  type InvitationCreateResponse,
  type InvitationRead,
  createInvitation,
  listInvitations,
  revokeInvitation,
} from "./api";

const ROLE_OPTIONS = [
  { code: "admin", label: "Administrator" },
  { code: "supervisor", label: "Supervisor" },
  { code: "tech", label: "Field tech" },
  { code: "intake", label: "Service intake" },
  { code: "readonly", label: "Read only" },
];

const inputClass =
  "mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm";

export function AdminInvitationsPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "invitations"],
    queryFn: listInvitations,
  });

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roles, setRoles] = useState<string[]>(["tech"]);
  const [days, setDays] = useState(7);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [created, setCreated] = useState<InvitationCreateResponse | null>(null);

  const create = useMutation<
    InvitationCreateResponse,
    Error,
    InvitationCreateInput
  >({
    mutationFn: createInvitation,
    onSuccess: (resp) => {
      setCreated(resp);
      setEmail("");
      setFullName("");
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] });
    },
    onError: (e) =>
      setErrorMessage(e instanceof ApiError ? e.message : String(e)),
  });

  const revoke = useMutation<InvitationRead, Error, number>({
    mutationFn: revokeInvitation,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["admin", "invitations"] }),
  });

  function toggleRole(code: string) {
    setRoles((r) => (r.includes(code) ? r.filter((x) => x !== code) : [...r, code]));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    create.mutate({
      email,
      full_name: fullName || undefined,
      role_codes: roles,
      expires_in_days: days,
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-medium text-slate-900">Invite a user</h2>
        <form onSubmit={onSubmit} className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label>
            Full name (optional)
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
            />
          </label>
          <div className="col-span-2">
            <span className="text-slate-700">Roles</span>
            <div className="mt-1 flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((r) => (
                <label key={r.code} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={roles.includes(r.code)}
                    onChange={() => toggleRole(r.code)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <label>
            Expires in (days)
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className={inputClass}
            />
          </label>
          <div className="col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {create.isPending ? "Inviting…" : "Send invitation"}
            </button>
          </div>
        </form>
        {errorMessage && (
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
        )}
        {created && (
          <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="font-medium text-emerald-800">
              Invitation created for {created.invitation.email}.
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              Send this link — it's only shown once:
            </p>
            <code className="mt-1 block break-all rounded bg-white p-2 text-xs">
              {created.accept_url}
            </code>
          </div>
        )}
      </section>

      <section className="rounded border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Expires</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {query.data?.items.map((inv) => (
              <tr key={inv.id}>
                <td className="px-3 py-2">
                  <div>{inv.email}</div>
                  {inv.full_name && (
                    <div className="text-xs text-slate-500">{inv.full_name}</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {inv.role_codes.length === 0 ? (
                    <span className="text-xs text-slate-400">none</span>
                  ) : (
                    inv.role_codes.join(", ")
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusPill inv={inv} />
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {new Date(inv.expires_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right">
                  {inv.accepted_at === null && inv.revoked_at === null && (
                    <button
                      onClick={() => revoke.mutate(inv.id)}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {query.data && query.data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-slate-500">
                  No invitations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatusPill({ inv }: { inv: InvitationRead }) {
  if (inv.accepted_at) {
    return (
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">
        accepted
      </span>
    );
  }
  if (inv.revoked_at) {
    return (
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
        revoked
      </span>
    );
  }
  if (new Date(inv.expires_at) < new Date()) {
    return (
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
        expired
      </span>
    );
  }
  return (
    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
      pending
    </span>
  );
}
