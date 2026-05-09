import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert } from "../../components/Alert";
import { Button } from "../../components/Button";
import { ErrorState, LoadingState } from "../../components/States";
import { UnsavedChangesGuard } from "../../components/UnsavedChangesGuard";
import { translateApiError } from "../../lib/translateApiError";
import { type AssetClassRead, listAssetClasses, updateAssetClass } from "./api";

export function AdminAssetClassesPage() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "asset-classes"],
    queryFn: listAssetClasses,
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [schemaText, setSchemaText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const current = query.data?.find((ac) => ac.code === selected) ?? null;
  const baseline = current ? JSON.stringify(current.attribute_schema, null, 2) : "";
  const dirty = !!current && schemaText !== baseline;

  useEffect(() => {
    if (current) {
      setSchemaText(JSON.stringify(current.attribute_schema, null, 2));
      setErrorMessage(null);
      setSavedAt(null);
    }
  }, [current]);

  const save = useMutation<AssetClassRead, Error, void>({
    mutationFn: () => {
      if (!current) throw new Error("no class selected");
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(schemaText);
      } catch (e) {
        throw new Error(`JSON parse error: ${e instanceof Error ? e.message : String(e)}`);
      }
      return updateAssetClass(current.code, { attribute_schema: parsed });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "asset-classes"] });
      setSavedAt(new Date().toLocaleTimeString());
      setErrorMessage(null);
    },
    onError: (e) => setErrorMessage(translateApiError(e)),
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError)
    return <ErrorState message="Failed to load asset classes." retry={() => query.refetch()} />;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
      <UnsavedChangesGuard
        dirty={dirty}
        title="Discard schema edits?"
        message="You have unsaved changes to this asset class's attribute schema. Leave the page and lose them?"
      />
      <aside className="md:col-span-4 max-h-[70vh] overflow-auto rounded border border-slate-800 bg-slate-900">
        <ul className="divide-y divide-slate-800 text-sm">
          {query.data?.map((ac) => (
            <li key={ac.code}>
              <button
                type="button"
                onClick={() => setSelected(ac.code)}
                className={`w-full px-3 py-2 text-left transition-colors ${
                  selected === ac.code
                    ? "bg-signal/15 font-medium ring-1 ring-signal/30"
                    : "hover:bg-slate-800/60"
                }`}
              >
                <div className="font-mono text-xs text-slate-400">{ac.code}</div>
                <div>{ac.name}</div>
                <div className="text-xs text-slate-400">{ac.domain}</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="md:col-span-8 space-y-3 rounded border border-slate-800 bg-slate-900 p-4">
        {!current ? (
          <p className="text-sm text-slate-400">
            Pick an asset class on the left to edit its attribute schema.
          </p>
        ) : (
          <>
            <header>
              <h2 className="text-lg font-medium">{current.name}</h2>
              <p className="text-xs text-slate-400">
                {current.code} · {current.domain} · {current.geometry_type}
              </p>
            </header>

            <label className="block text-sm">
              <span className="text-slate-200">attribute_schema (JSON Schema)</span>
              <textarea
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                rows={18}
                spellCheck={false}
                className="mt-1 block w-full rounded border border-slate-700 px-2 py-1 font-mono text-xs"
              />
            </label>

            <p className="text-xs text-slate-400">
              The server validates against the JSON Schema 2020-12 meta-schema. Existing assets are{" "}
              <em>not</em> re-validated; conformance for new assets only.
            </p>

            {errorMessage && <Alert>{errorMessage}</Alert>}
            {savedAt && <Alert variant="success">Saved at {savedAt}.</Alert>}

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setSchemaText(baseline);
                  setErrorMessage(null);
                }}
                disabled={!dirty}
              >
                Reset
              </Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending || !dirty}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
