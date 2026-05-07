import type { PillTone } from "../../components/StatusPill";
import type { SrPriority, SrStatus } from "./api";

/**
 * Status / priority → StatusPill tone mapping for service requests.
 *
 * One source of truth so the SR list, detail, dashboard, and intake
 * surfaces all agree on the colour for each value.
 */

export const SR_STATUS_TONE: Record<SrStatus, PillTone> = {
  new: "info",
  triaged: "warning",
  dispatched: "info",
  closed: "muted",
  duplicate: "muted",
};

export const SR_PRIORITY_TONE: Record<SrPriority, PillTone> = {
  emergency: "danger",
  high: "warning",
  normal: "neutral",
  low: "muted",
};
