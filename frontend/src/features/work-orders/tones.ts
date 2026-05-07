import type { PillTone } from "../../components/StatusPill";
import type { WoPriority, WoStatus } from "./api";

/**
 * Status / priority → StatusPill tone mapping for work orders.
 *
 * One source of truth so the WO list, detail page, kanban board,
 * dashboard "today's queue", and any future surface all agree on the
 * colour of "in progress" or "high".
 */

export const WO_STATUS_TONE: Record<WoStatus, PillTone> = {
  draft: "muted",
  open: "info",
  assigned: "info",
  in_progress: "info",
  on_hold: "warning",
  completed: "success",
  cancelled: "neutral",
};

export const WO_PRIORITY_TONE: Record<WoPriority, PillTone> = {
  low: "muted",
  normal: "neutral",
  high: "warning",
  emergency: "danger",
};
