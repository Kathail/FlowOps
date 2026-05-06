import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "../../lib/apiClient";
import {
  type UserRead,
  deactivateUser,
  listUsers,
  updateUserRoles,
} from "./api";

const ROLE_OPTIONS = [
  { code: "admin", label: "Administrator" },
  { code: "supervisor", label: "Supervisor" },
  { code: "tech", label: "Field tech" },
  { code: "intake", label: "Service intake" },
  { code: "readonly", label: "Read only" },
];

export function AdminUsersPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "users"], queryFn: listUsers });

  return (
    <div>
      {query.isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {query.isError && (
        <p className="text-sm text-red-400">Failed to load users.</p>
      )}
      {query.data && (
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50 text-left text-xs uppercase text-slate-400">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {query.data.items.map((u) => (
              <UserRow
                key={u.user_uid}
                user={u}
                onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "users"] })}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function UserRow({ user, onChanged }: { user: UserRead; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(
    user.roles.map((r) => r.code),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const saveRoles = useMutation<UserRead, Error>({
    mutationFn: () => updateUserRoles(user.user_uid, selected),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
    onError: (e) =>
      setErrorMessage(e instanceof ApiError ? e.message : String(e)),
  });

  const deactivate = useMutation<UserRead, Error>({
    mutationFn: () => deactivateUser(user.user_uid),
    onSuccess: onChanged,
  });

  function toggle(code: string) {
    setSelected((s) =>
      s.includes(code) ? s.filter((x) => x !== code) : [...s, code],
    );
  }

  return (
    <tr className="align-top">
      <td className="px-3 py-2">{user.full_name}</td>
      <td className="px-3 py-2 text-slate-300">{user.email}</td>
      <td className="px-3 py-2">
        {editing ? (
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => (
              <label
                key={r.code}
                className="flex items-center gap-1 text-xs"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(r.code)}
                  onChange={() => toggle(r.code)}
                />
                {r.label}
              </label>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {user.roles.map((r) => (
              <span
                key={r.code}
                className="rounded bg-slate-800 px-1.5 py-0.5 text-xs"
              >
                {r.code}
              </span>
            ))}
            {user.roles.length === 0 && (
              <span className="text-xs text-slate-400">none</span>
            )}
          </div>
        )}
        {errorMessage && (
          <p className="mt-1 text-xs text-red-400">{errorMessage}</p>
        )}
      </td>
      <td className="px-3 py-2">
        {user.is_active ? (
          <span className="text-emerald-300">yes</span>
        ) : (
          <span className="text-slate-400">no</span>
        )}
      </td>
      <td className="px-3 py-2">
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={() => saveRoles.mutate()}
              disabled={saveRoles.isPending}
              className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-400 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setSelected(user.roles.map((r) => r.code));
                setEditing(false);
                setErrorMessage(null);
              }}
              className="rounded border border-slate-700 px-2 py-1 text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
            >
              Edit roles
            </button>
            {user.is_active && (
              <button
                onClick={() => {
                  if (window.confirm(`Deactivate ${user.email}?`))
                    deactivate.mutate();
                }}
                disabled={deactivate.isPending}
                className="rounded border border-red-300 px-2 py-1 text-xs text-red-300 hover:bg-red-50 disabled:opacity-50"
              >
                Deactivate
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
