import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../lib/apiClient";
import { type TenantRead, getTenant, updateTenant } from "./api";

const inputClass =
  "mt-1 block w-full rounded border border-slate-300 px-2 py-1 text-sm";

const UNITS_OPTIONS = ["imperial", "metric"];
const LOCALES = ["en-US", "en-CA", "en-GB", "es-ES", "fr-FR"];

export function AdminTenantPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "tenant"], queryFn: getTenant });

  const [name, setName] = useState("");
  const [locale, setLocale] = useState("en-US");
  const [units, setUnits] = useState("imperial");
  const [logoUrl, setLogoUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) {
      setName(query.data.name);
      const s = query.data.settings as Record<string, unknown>;
      setLocale(typeof s.locale === "string" ? s.locale : "en-US");
      setUnits(typeof s.units === "string" ? s.units : "imperial");
      setLogoUrl(typeof s.logo_url === "string" ? s.logo_url : "");
    }
  }, [query.data]);

  const save = useMutation<TenantRead, Error>({
    mutationFn: () =>
      updateTenant({
        name,
        settings: {
          ...(query.data?.settings ?? {}),
          locale,
          units,
          logo_url: logoUrl || undefined,
        },
      }),
    onSuccess: (t) => {
      qc.setQueryData(["admin", "tenant"], t);
      setSavedAt(new Date().toLocaleTimeString());
      setErrorMessage(null);
    },
    onError: (e) =>
      setErrorMessage(e instanceof ApiError ? e.message : String(e)),
  });

  if (query.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (query.isError)
    return <p className="text-sm text-red-600">Failed to load tenant.</p>;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSavedAt(null);
    save.mutate();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-4 rounded border border-slate-200 bg-white p-4 text-sm"
    >
      <label className="block">
        <span className="text-slate-700">Tenant name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="text-slate-700">Locale</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className={inputClass}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-slate-700">Units</span>
          <select
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            className={inputClass}
          >
            {UNITS_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-slate-700">Logo URL (optional)</span>
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://example.com/logo.svg"
          className={inputClass}
        />
      </label>

      <p className="text-xs text-slate-500">
        Slug <code className="rounded bg-slate-100 px-1">/{query.data?.slug}</code>{" "}
        is fixed for v1. Reach out to support to rename.
      </p>

      {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
      {savedAt && (
        <p className="text-xs text-emerald-700">Saved at {savedAt}.</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={save.isPending}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
