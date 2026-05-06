/**
 * Renders the containing service areas as chips. The "primary" kind for
 * the entity (driven by the active task definition's default_domain)
 * gets highlighted; everything else fades back. Maintenance districts
 * are always highlighted because they're operational, not domain-bound.
 */

interface Area {
  id: number;
  code: string;
  name: string;
  kind: "maintenance" | "water_system" | "sewer_system" | "storm_system";
  color: string | null;
}

const KIND_LABEL: Record<Area["kind"], string> = {
  maintenance: "Maintenance",
  water_system: "Water",
  sewer_system: "Sewer",
  storm_system: "Storm",
};

export function AreaChips({
  areas,
  taskDomain,
  className,
}: {
  areas: Area[] | undefined;
  taskDomain?: string | null;
  className?: string;
}) {
  if (!areas || areas.length === 0) return null;

  const primaryKind = systemKindForDomain(taskDomain);

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {areas.map((a) => {
        const isPrimary = a.kind === "maintenance" || a.kind === primaryKind;
        return (
          <li
            key={a.id}
            title={`${KIND_LABEL[a.kind]} — ${a.code}`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
              isPrimary
                ? "border border-slate-700 bg-slate-900/80 text-slate-200"
                : "border border-slate-800 bg-slate-950/40 text-slate-500"
            }`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{
                backgroundColor: a.color ?? "#475569",
                opacity: isPrimary ? 1 : 0.5,
              }}
            />
            {a.name}
          </li>
        );
      })}
    </ul>
  );
}

function systemKindForDomain(domain: string | null | undefined): Area["kind"] | null {
  if (domain === "water") return "water_system";
  if (domain === "sewer") return "sewer_system";
  if (domain === "storm") return "storm_system";
  return null;
}
