import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listPacpCodes, type PacpCode } from "../api";

interface Observation {
  distance_m: string;
  code: string;
  remarks: string;
  clock_from: string;
  clock_to: string;
  joint: boolean;
  continuous: boolean;
}

interface Props {
  onChange: (data: Record<string, unknown>) => void;
}

const EMPTY_OBS: Observation = {
  distance_m: "",
  code: "",
  remarks: "",
  clock_from: "",
  clock_to: "",
  joint: false,
  continuous: false,
};

export function CctvForm({ onChange }: Props) {
  const codesQuery = useQuery<PacpCode[], Error>({
    queryKey: ["pacp-codes"],
    queryFn: listPacpCodes,
    staleTime: 5 * 60 * 1000,
  });

  const [survey, setSurvey] = useState({
    standard: "PACP",
    version: "7.0",
    upstream_mh: "",
    downstream_mh: "",
    direction: "" as "" | "upstream" | "downstream",
    length_surveyed_m: "",
    length_total_m: "",
  });
  const [observations, setObservations] = useState<Observation[]>([{ ...EMPTY_OBS }]);

  useEffect(() => {
    const out: Record<string, unknown> = {
      standard: survey.standard,
      version: survey.version,
    };
    if (survey.upstream_mh) out.upstream_mh = survey.upstream_mh;
    if (survey.downstream_mh) out.downstream_mh = survey.downstream_mh;
    if (survey.direction) out.direction = survey.direction;
    if (survey.length_surveyed_m) out.length_surveyed_m = survey.length_surveyed_m;
    if (survey.length_total_m) out.length_total_m = survey.length_total_m;

    out.observations = observations
      .filter((o) => o.distance_m && o.code)
      .map((o) => {
        const obs: Record<string, unknown> = {
          distance_m: o.distance_m,
          code: o.code,
          joint: o.joint,
          continuous: o.continuous,
        };
        if (o.remarks) obs.remarks = o.remarks;
        if (o.clock_from) obs.clock_from = Number(o.clock_from);
        if (o.clock_to) obs.clock_to = Number(o.clock_to);
        return obs;
      });
    onChange(out);
  }, [survey, observations, onChange]);

  function setObs<K extends keyof Observation>(i: number, key: K, value: Observation[K]) {
    setObservations((prev) => prev.map((obs, idx) => (idx === i ? { ...obs, [key]: value } : obs)));
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-xs text-slate-300">Standard</span>
          <select
            value={survey.standard}
            onChange={(e) => setSurvey({ ...survey, standard: e.target.value })}
            className="mt-1 block w-full rounded border border-slate-700 px-2 py-1 text-sm bg-slate-900"
          >
            <option value="PACP">PACP</option>
            <option value="MACP">MACP</option>
            <option value="LACP">LACP</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-300">Version</span>
          <input
            value={survey.version}
            onChange={(e) => setSurvey({ ...survey, version: e.target.value })}
            className="mt-1 block w-full rounded border border-slate-700 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-300">Direction</span>
          <select
            value={survey.direction}
            onChange={(e) =>
              setSurvey({
                ...survey,
                direction: e.target.value as "" | "upstream" | "downstream",
              })
            }
            className="mt-1 block w-full rounded border border-slate-700 px-2 py-1 text-sm bg-slate-900"
          >
            <option value="">—</option>
            <option value="upstream">Upstream</option>
            <option value="downstream">Downstream</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs text-slate-300">Upstream MH</span>
          <input
            value={survey.upstream_mh}
            onChange={(e) => setSurvey({ ...survey, upstream_mh: e.target.value })}
            className="mt-1 block w-full rounded border border-slate-700 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-300">Downstream MH</span>
          <input
            value={survey.downstream_mh}
            onChange={(e) => setSurvey({ ...survey, downstream_mh: e.target.value })}
            className="mt-1 block w-full rounded border border-slate-700 px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-slate-300">Length surveyed (m)</span>
          <input
            type="number"
            step="0.1"
            value={survey.length_surveyed_m}
            onChange={(e) => setSurvey({ ...survey, length_surveyed_m: e.target.value })}
            className="mt-1 block w-full rounded border border-slate-700 px-2 py-1 text-sm"
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs uppercase text-slate-400 mb-1">Observations</legend>
        <div className="space-y-2">
          {observations.map((o, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-1 items-end border border-slate-800 rounded p-2 bg-slate-900"
            >
              <label className="block col-span-2">
                <span className="text-xs text-slate-300">Distance (m)</span>
                <input
                  type="number"
                  step="0.1"
                  value={o.distance_m}
                  onChange={(e) => setObs(i, "distance_m", e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-700 px-1 py-0.5 text-sm"
                />
              </label>
              <label className="block col-span-3">
                <span className="text-xs text-slate-300">Code</span>
                <select
                  value={o.code}
                  onChange={(e) => setObs(i, "code", e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-700 px-1 py-0.5 text-sm bg-slate-900"
                >
                  <option value="">—</option>
                  {codesQuery.data?.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.description}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block col-span-1">
                <span className="text-xs text-slate-300">From</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={o.clock_from}
                  onChange={(e) => setObs(i, "clock_from", e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-700 px-1 py-0.5 text-sm"
                />
              </label>
              <label className="block col-span-1">
                <span className="text-xs text-slate-300">To</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={o.clock_to}
                  onChange={(e) => setObs(i, "clock_to", e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-700 px-1 py-0.5 text-sm"
                />
              </label>
              <label className="block col-span-3">
                <span className="text-xs text-slate-300">Remarks</span>
                <input
                  value={o.remarks}
                  onChange={(e) => setObs(i, "remarks", e.target.value)}
                  className="mt-1 block w-full rounded border border-slate-700 px-1 py-0.5 text-sm"
                />
              </label>
              <div className="col-span-1 flex flex-col items-center gap-1 text-xs">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={o.joint}
                    onChange={(e) => setObs(i, "joint", e.target.checked)}
                  />
                  J
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={o.continuous}
                    onChange={(e) => setObs(i, "continuous", e.target.checked)}
                  />
                  C
                </label>
              </div>
              <button
                type="button"
                onClick={() => setObservations((prev) => prev.filter((_, idx) => idx !== i))}
                className="col-span-1 text-xs text-red-400 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setObservations((prev) => [...prev, { ...EMPTY_OBS }])}
          className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          + Observation
        </button>
      </fieldset>
    </div>
  );
}
