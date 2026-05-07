import type { PillTone } from "./StatusPill";
import { StatusPill } from "./StatusPill";

/**
 * 1–5 condition rating with a colour + word for instant scannability.
 * Industry-standard 5-point asset condition scale (1 = excellent,
 * 5 = critical). Used on both Asset and Inspection rows.
 *
 *   1  Excellent  → success
 *   2  Good       → success (lighter)
 *   3  Fair       → warning
 *   4  Poor       → warning (heavier)
 *   5  Critical   → danger
 *
 * Renders nothing when the value is null/undefined so callers can
 * drop it directly into a table cell:
 *
 *   <ConditionBadge value={asset.condition} />
 */

const SCALE: Record<number, { label: string; tone: PillTone }> = {
  1: { label: "Excellent", tone: "success" },
  2: { label: "Good", tone: "success" },
  3: { label: "Fair", tone: "warning" },
  4: { label: "Poor", tone: "warning" },
  5: { label: "Critical", tone: "danger" },
};

interface Props {
  value: number | null | undefined;
  /** Show the numeric rating in addition to the label. Defaults to
   * `true` so the underlying ordinal value remains visible. */
  showNumber?: boolean;
}

export function ConditionBadge({ value, showNumber = true }: Props) {
  if (value === null || value === undefined) return null;
  const meta = SCALE[value];
  if (!meta) {
    return <StatusPill tone="muted">{value}</StatusPill>;
  }
  return (
    <StatusPill tone={meta.tone} dot>
      {showNumber ? `${value} · ${meta.label}` : meta.label}
    </StatusPill>
  );
}
