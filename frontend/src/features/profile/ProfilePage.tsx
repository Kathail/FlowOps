import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/States";
import { translateApiError } from "../../lib/translateApiError";
import { getMe, updateMe, type UserSelfUpdateInput } from "../admin/api";
import { listServiceAreas } from "../planning/api";

/**
 * Self-serve operator profile. Lets any authenticated user edit their
 * own contact info (full name, phone, title) and notification
 * preferences (notify_on_assignment + default home territory). Admin-
 * only fields (employee_number, is_active, roles) are read-only here;
 * an admin can change those from the admin user page.
 *
 * Design note: this page is the *operator's* view of themselves, so
 * the email + employee number are surfaced as identity/breadcrumb
 * rather than editable fields — operators trying to "fix" their email
 * should ask their admin instead.
 */
export function ProfilePage() {
  // Note: useAuth() also caches under ["me"]; we use a distinct key
  // so a profile-update doesn't overwrite the AuthEnvelope shape and
  // bounce the user back to /login on the next render.
  const meQuery = useQuery({ queryKey: ["users", "me"], queryFn: getMe });
  const areasQuery = useQuery({ queryKey: ["service-areas"], queryFn: listServiceAreas });
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<UserSelfUpdateInput>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Hydrate the draft once the GET returns. We don't keep the form
  // value in tanstack-query because edits should feel optimistic — the
  // textbox should reflect what the user is typing, not the cached
  // server value.
  useEffect(() => {
    if (meQuery.data) {
      setDraft({
        full_name: meQuery.data.full_name,
        phone: meQuery.data.phone ?? "",
        title: meQuery.data.title ?? "",
        default_area_id: meQuery.data.default_area_id,
        notify_on_assignment: meQuery.data.notify_on_assignment,
      });
    }
  }, [meQuery.data]);

  const save = useMutation({
    mutationFn: (input: UserSelfUpdateInput) => updateMe(input),
    onSuccess: (updated) => {
      setErrorMessage(null);
      setSavedAt(Date.now());
      queryClient.setQueryData(["users", "me"], updated);
      // The auth envelope (cached under ["me"] by useAuth) carries a
      // copy of full_name, so refetch it after a profile edit so the
      // tenant shell + audit trails see the new name immediately.
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e: Error) => setErrorMessage(translateApiError(e)),
  });

  if (meQuery.isLoading) return <LoadingState />;
  if (meQuery.isError || !meQuery.data) {
    return (
      <ErrorState message="Could not load your profile." retry={() => meQuery.refetch()} />
    );
  }

  const me = meQuery.data;
  const areas = areasQuery.data?.items ?? [];

  function set<K extends keyof UserSelfUpdateInput>(key: K, value: UserSelfUpdateInput[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSavedAt(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    save.mutate({
      full_name: draft.full_name?.trim() || undefined,
      phone: (draft.phone ?? "").trim() || null,
      title: (draft.title ?? "").trim() || null,
      default_area_id: draft.default_area_id ?? null,
      notify_on_assignment: draft.notify_on_assignment,
    });
  }

  return (
    <div className="p-4 sm:p-8 space-y-4">
      <PageHeader
        eyebrow="You"
        title="Your profile"
        caption="Update your contact info and how the system reaches you when work lands on your queue."
      />

      {errorMessage && <Alert>{errorMessage}</Alert>}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* ----- Identity (read-only) ----- */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <h3 className="section-label-strong mb-3">Identity</h3>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ReadOnlyRow label="Email" value={me.email} hint="Contact your admin to change." />
            <ReadOnlyRow
              label="Employee #"
              value={me.employee_number ?? "—"}
              hint="Set by admin."
            />
            <ReadOnlyRow
              label="Roles"
              value={(me.roles ?? []).map((r) => r.code).join(", ") || "none"}
            />
            <ReadOnlyRow
              label="Last sign-in"
              value={
                me.last_login_at
                  ? new Date(me.last_login_at).toLocaleString()
                  : "—"
              }
            />
          </dl>
        </section>

        {/* ----- Editable contact ----- */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h3 className="section-label-strong">Contact</h3>
          <Field label="Full name">
            <input
              type="text"
              value={draft.full_name ?? ""}
              onChange={(e) => set("full_name", e.target.value)}
              required
              className="input"
            />
          </Field>
          <Field label="Title" hint="e.g. Field Tech II, Crew Lead">
            <input
              type="text"
              value={draft.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
              maxLength={64}
              className="input"
            />
          </Field>
          <Field label="Phone" hint="Used for radio handoff lookup; not required">
            <input
              type="tel"
              value={draft.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              maxLength={32}
              className="input"
            />
          </Field>
        </section>

        {/* ----- Preferences ----- */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h3 className="section-label-strong">Notifications & territory</h3>
          <label className="flex cursor-pointer items-start gap-3 rounded border border-slate-800 bg-slate-950/40 p-3">
            <input
              type="checkbox"
              checked={draft.notify_on_assignment ?? true}
              onChange={(e) => set("notify_on_assignment", e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm text-slate-100">Email me when a work order is assigned to me</div>
              <p className="mt-0.5 text-xs text-slate-500">
                Sent to <span className="font-mono">{me.email}</span>. The email includes the WO
                number, title, priority, and a deep link.
              </p>
            </div>
          </label>

          <Field label="Default home territory" hint="Informational. Future: tie-breaker for territory routing.">
            <select
              value={draft.default_area_id ?? ""}
              onChange={(e) =>
                set("default_area_id", e.target.value ? Number(e.target.value) : null)
              }
              className="input"
            >
              <option value="">— None —</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.code}
                </option>
              ))}
            </select>
          </Field>
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
          {savedAt && !save.isPending && (
            <span className="text-xs text-emerald-400">Saved.</span>
          )}
        </div>
      </form>
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-200">{value}</dd>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </label>
  );
}
