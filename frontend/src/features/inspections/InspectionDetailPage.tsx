import { Link, useParams } from "react-router-dom";
import { useInspection } from "./hooks";

export function InspectionDetailPage() {
  const { slug, n } = useParams<{ slug: string; n: string }>();
  const insQuery = useInspection(n);

  if (insQuery.isLoading) return <div className="p-8 text-slate-500">Loading…</div>;
  if (insQuery.error) return <div className="p-8 text-red-600">{insQuery.error.message}</div>;
  const ins = insQuery.data!;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <header className="space-y-1">
        <Link to={`/${slug}/inspections`} className="text-sm text-slate-500 hover:underline">
          ← Back to inspections
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">{ins.inspection_number}</h1>
        <p className="text-base text-slate-700">{ins.kind.replace(/_/g, " ")}</p>
        <p className="text-xs text-slate-500">
          Performed {ins.performed_at.slice(0, 16).replace("T", " ")}
          {ins.asset_uid && (
            <>
              {" · "}
              <Link to={`/${slug}/assets/${ins.asset_uid}`} className="font-mono hover:underline">
                {ins.asset_uid}
              </Link>
            </>
          )}
          {ins.work_order_number && (
            <>
              {" · "}
              <Link
                to={`/${slug}/work-orders/${ins.work_order_number}`}
                className="font-mono hover:underline"
              >
                {ins.work_order_number}
              </Link>
            </>
          )}
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500 mb-2">Summary</h2>
        <dl className="grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-slate-500">Overall condition</dt>
          <dd>{ins.overall_condition ?? "—"}</dd>
          <dt className="text-slate-500">Pass</dt>
          <dd>{ins.pass === null ? "—" : ins.pass ? "Pass" : "Fail"}</dd>
        </dl>
        {ins.notes && (
          <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{ins.notes}</p>
        )}
      </section>

      {ins.kind === "cctv" ? (
        <CctvLayout data={ins.data} />
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500 mb-2">
            {ins.kind.replace(/_/g, " ")} data
          </h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            {Object.entries(ins.data).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-500 font-mono text-xs">{k}</dt>
                <dd className="text-slate-800">{formatValue(v)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

interface CctvObservation {
  distance_m: string | number;
  code: string;
  remarks?: string;
  clock_from?: number;
  clock_to?: number;
  joint?: boolean;
  continuous?: boolean;
  severity?: number;
}

function CctvLayout({ data }: { data: Record<string, unknown> }) {
  const obs = (data.observations as CctvObservation[] | undefined) ?? [];
  const ratings = data.ratings as
    | {
        structural_qr?: number;
        om_qr?: number;
        structural_total?: number;
        om_total?: number;
      }
    | undefined;
  const sorted = [...obs].sort((a, b) => Number(a.distance_m) - Number(b.distance_m));
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500 mb-2">Survey</h2>
        <dl className="grid grid-cols-3 gap-y-1 text-sm">
          <dt className="text-slate-500">Standard</dt>
          <dd className="col-span-2">
            {String(data.standard ?? "PACP")} {String(data.version ?? "")}
          </dd>
          <dt className="text-slate-500">Direction</dt>
          <dd className="col-span-2">{String(data.direction ?? "—")}</dd>
          <dt className="text-slate-500">Upstream MH</dt>
          <dd className="col-span-2 font-mono">{String(data.upstream_mh ?? "—")}</dd>
          <dt className="text-slate-500">Downstream MH</dt>
          <dd className="col-span-2 font-mono">{String(data.downstream_mh ?? "—")}</dd>
          <dt className="text-slate-500">Length surveyed</dt>
          <dd className="col-span-2">{String(data.length_surveyed_m ?? "—")} m</dd>
        </dl>
        {ratings && (
          <dl className="grid grid-cols-4 gap-y-1 text-sm mt-3 pt-3 border-t border-slate-100">
            <dt className="text-slate-500">Structural QR</dt>
            <dd>{ratings.structural_qr ?? "—"}</dd>
            <dt className="text-slate-500">O&amp;M QR</dt>
            <dd>{ratings.om_qr ?? "—"}</dd>
          </dl>
        )}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-slate-500 mb-2">
          Observations ({sorted.length})
        </h2>
        {sorted.length === 0 && <p className="text-sm text-slate-500">None</p>}
        {sorted.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-slate-600 text-left">
              <tr>
                <th className="px-2 py-1">Distance</th>
                <th className="px-2 py-1">Code</th>
                <th className="px-2 py-1">Clock</th>
                <th className="px-2 py-1">Flags</th>
                <th className="px-2 py-1">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((o, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-2 py-1 font-mono text-xs">{String(o.distance_m)} m</td>
                  <td className="px-2 py-1 font-mono">{o.code}</td>
                  <td className="px-2 py-1 text-xs text-slate-500">
                    {o.clock_from && o.clock_to ? `${o.clock_from}→${o.clock_to}` : "—"}
                  </td>
                  <td className="px-2 py-1 text-xs text-slate-500">
                    {[o.joint && "J", o.continuous && "C"].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-2 py-1 text-slate-700">{o.remarks ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
