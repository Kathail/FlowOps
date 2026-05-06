import { describe, expect, it } from "vitest";
import { autoChecked, getStepState, isStepChecked } from "./stepState";
import type { ProcedureStep } from "./api";

const stepWithRule: ProcedureStep = {
  n: 1,
  title: "Flushed",
  auto_complete_when: "flush_completed == true",
};
const stepNoRule: ProcedureStep = { n: 2, title: "Manual" };

describe("isStepChecked", () => {
  it("returns auto-rule result when no override", () => {
    expect(isStepChecked(stepWithRule, { flush_completed: true })).toBe(true);
    expect(isStepChecked(stepWithRule, { flush_completed: false })).toBe(false);
  });

  it("override=true wins over auto-rule false", () => {
    expect(
      isStepChecked(stepWithRule, {
        flush_completed: false,
        _steps: { 1: true },
      }),
    ).toBe(true);
  });

  it("override=false wins over auto-rule true", () => {
    expect(
      isStepChecked(stepWithRule, {
        flush_completed: true,
        _steps: { 1: false },
      }),
    ).toBe(false);
  });

  it("override=null falls through to auto-rule", () => {
    expect(
      isStepChecked(stepWithRule, {
        flush_completed: true,
        _steps: { 1: null },
      }),
    ).toBe(true);
  });

  it("step without auto-rule defaults to unchecked", () => {
    expect(isStepChecked(stepNoRule, {})).toBe(false);
  });

  it("step without auto-rule but with override=true is checked", () => {
    expect(isStepChecked(stepNoRule, { _steps: { 2: true } })).toBe(true);
  });
});

describe("autoChecked", () => {
  it("returns false when there's no auto rule", () => {
    expect(autoChecked(stepNoRule, { _steps: { 2: true } })).toBe(false);
  });
  it("evaluates the auto rule against task_data", () => {
    expect(autoChecked(stepWithRule, { flush_completed: true })).toBe(true);
    expect(autoChecked(stepWithRule, {})).toBe(false);
  });
  it("ignores manual overrides — autoChecked is the rule's verdict only", () => {
    // override=false but rule says true → autoChecked still returns true
    expect(
      autoChecked(stepWithRule, {
        flush_completed: true,
        _steps: { 1: false },
      }),
    ).toBe(true);
  });
});

describe("getStepState", () => {
  it("returns empty record when _steps absent", () => {
    expect(getStepState({})).toEqual({});
  });
  it("returns _steps when present", () => {
    expect(getStepState({ _steps: { 1: true, 2: false } })).toEqual({
      1: true,
      2: false,
    });
  });
});
