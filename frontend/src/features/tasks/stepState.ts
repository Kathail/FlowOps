import { safeEvaluate } from "../../lib/expr";
import type { ProcedureStep } from "./api";

/**
 * Shared check-state resolver used by both `ProcedureRunner` (which
 * renders the checkbox) and `ChecklistDraft` (which builds the comment
 * draft from ticked steps). Keeping the logic in one place is the only
 * way to guarantee these two surfaces never disagree about whether a
 * step is "ticked".
 *
 * Rule: a manual override in `task_data._steps[n]` (true or false)
 * always wins. If no override exists, fall back to the step's
 * `auto_complete_when` rule. If neither applies, the step is unticked.
 */
export type StepState = Record<number, boolean | null>;

export function getStepState(taskData: Record<string, unknown>): StepState {
  return (taskData._steps as StepState | undefined) ?? {};
}

export function isStepChecked(
  step: ProcedureStep,
  taskData: Record<string, unknown>,
): boolean {
  const override = getStepState(taskData)[step.n];
  if (override === true || override === false) return override;
  if (step.auto_complete_when) {
    return safeEvaluate(step.auto_complete_when, taskData, false);
  }
  return false;
}

export function autoChecked(
  step: ProcedureStep,
  taskData: Record<string, unknown>,
): boolean {
  if (!step.auto_complete_when) return false;
  return safeEvaluate(step.auto_complete_when, taskData, false);
}
