import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState, LoadingState } from "../../components/States";
import { StatusPill } from "../../components/StatusPill";
import { translateApiError } from "../../lib/translateApiError";
import { type UserRead, deactivateUser, listUsers, updateUserRoles } from "./api";

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
      {query.isLoading && <LoadingState />}
      {query.isError && (
        <ErrorState message="Failed to load users." retry={() => query.refetch()} />
      )}
      {query.data && (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
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
        </div>
      )}
    </div>
  );
}

function UserRow({ user, onChanged }: { user: UserRead; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState<string[]>(user.roles.map((r) => r.code));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const saveRoles = useMutation<UserRead, Error>({
    mutationFn: () => updateUserRoles(user.user_uid, selected),
    onSuccess: () => {
      setEditing(false);
      onChanged();
    },
    onError: (e) => setErrorMessage(translateApiError(e)),
  });

  const deactivate = useMutation<UserRead, Error>({
    mutationFn: () => deactivateUser(user.user_uid),
    onSuccess: () => {
      setDeactivateOpen(false);
      onChanged();
    },
    onError: (e) => setDeactivateError(translateApiError(e)),
  });

  function toggle(code: string) {
    setSelected((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]));
  }

  return (
    <>
      <tr className="align-top">
        <td className="px-3 py-2">{user.full_name}</td>
        <td className="px-3 py-2 text-slate-300">{user.email}</td>
        <td className="px-3 py-2">
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((r) => (
                <label key={r.code} className="flex items-center gap-1 text-xs">
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
                <StatusPill key={r.code} tone="muted">
                  {r.code}
                </StatusPill>
              ))}
              {user.roles.length === 0 && <span className="text-xs text-slate-400">none</span>}
            </div>
          )}
          {errorMessage && <p className="mt-1 text-xs text-red-400">{errorMessage}</p>}
        </td>
        <td className="px-3 py-2">
          {user.is_active ? (
            <StatusPill tone="success" dot>
              active
            </StatusPill>
          ) : (
            <StatusPill tone="muted">inactive</StatusPill>
          )}
        </td>
        <td className="px-3 py-2">
          {editing ? (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveRoles.mutate()} disabled={saveRoles.isPending}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelected(user.roles.map((r) => r.code));
                  setEditing(false);
                  setErrorMessage(null);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Edit roles
              </Button>
              {user.is_active && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setDeactivateError(null);
                    setDeactivateOpen(true);
                  }}
                  disabled={deactivate.isPending}
                >
                  Deactivate
                </Button>
              )}
            </div>
          )}
        </td>
      </tr>
      {deactivateOpen && (
        <ConfirmDialog
          title={`Deactivate ${user.email}?`}
          message="They will lose access immediately. You can reactivate them later from the same page."
          confirmLabel="Deactivate user"
          errorMessage={deactivateError}
          busy={deactivate.isPending}
          onConfirm={() => deactivate.mutate()}
          onCancel={() => setDeactivateOpen(false)}
        />
      )}
    </>
  );
}
