import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../../lib/apiClient";
import { importPacp, type InspectionRead } from "./api";

interface Props {
  onClose: () => void;
}

export function ImportPacpDialog({ onClose }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [file, setFile] = useState<File | null>(null);
  const [assetUid, setAssetUid] = useState("");
  const [woNumber, setWoNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const upload = useMutation<InspectionRead, Error>({
    mutationFn: () => {
      if (!file) throw new Error("Pick a file first");
      return importPacp(file, {
        asset_uid: assetUid || undefined,
        work_order_number: woNumber || undefined,
      });
    },
    onSuccess: (ins) => {
      queryClient.invalidateQueries({ queryKey: ["inspections"] });
      navigate(`/${slug}/inspections/${ins.inspection_number}`);
    },
    onError: (err) => {
      setErrorMessage(err instanceof ApiError ? err.message : err.message);
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    upload.mutate();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-pacp-title"
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-lg bg-slate-900 p-5 shadow-xl space-y-3"
      >
        <header className="flex items-start justify-between">
          <div>
            <h2 id="import-pacp-title" className="text-lg font-semibold text-slate-100">
              Import PACP survey
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              WinCan-style XML or JSON. Validated against the PACP code catalog.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <label className="block">
          <span className="text-xs text-slate-300">File</span>
          <input
            type="file"
            accept=".xml,.json,application/xml,text/xml,application/json"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-slate-300">Asset UID (optional)</span>
            <input
              value={assetUid}
              onChange={(e) => setAssetUid(e.target.value)}
              placeholder="MH-00001"
              className="mt-1 block w-full rounded border border-slate-700 px-2 py-1 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-300">Linked WO (optional)</span>
            <input
              value={woNumber}
              onChange={(e) => setWoNumber(e.target.value)}
              placeholder="WO-2026-00001"
              className="mt-1 block w-full rounded border border-slate-700 px-2 py-1 text-sm"
            />
          </label>
        </div>

        {errorMessage && (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || upload.isPending}
            className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-400 disabled:opacity-50"
          >
            {upload.isPending ? "Importing…" : "Import"}
          </button>
        </div>
      </form>
    </div>
  );
}
