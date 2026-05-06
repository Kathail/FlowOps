import { describe, expect, it } from "vitest";
import { ExpressionError, evaluate, interpolate, safeEvaluate } from "./expr";
import fixtures from "./expr.fixtures.json";

interface FixtureCase {
  expression: string;
  context: Record<string, unknown>;
  expected: boolean | "error";
}

// `expr.fixtures.json` is a copy of `backend/tests/fixtures/expr_cases.json`.
// Both implementations of the evaluator must agree on every case — that's
// the whole point of the shared fixture suite. A repo pre-commit hook
// fails if the two files drift (added in a follow-up PR).
const cases = fixtures as FixtureCase[];

describe("expr fixtures (shared with Python)", () => {
  for (const c of cases) {
    const label = `${c.expression}  ⇒  ${String(c.expected)}`;
    it(label, () => {
      if (c.expected === "error") {
        expect(() => evaluate(c.expression, c.context)).toThrow(ExpressionError);
      } else {
        expect(evaluate(c.expression, c.context)).toBe(c.expected);
      }
    });
  }
});

describe("safeEvaluate", () => {
  it("returns default on parse error", () => {
    expect(safeEvaluate("(x", {})).toBe(false);
    expect(safeEvaluate("(x", {}, true)).toBe(true);
  });

  it("treats empty / null expression as truthy (always shown)", () => {
    expect(safeEvaluate(null, {})).toBe(true);
    expect(safeEvaluate("", {})).toBe(true);
    expect(safeEvaluate(undefined, {})).toBe(true);
  });
});

describe("interpolate", () => {
  it("substitutes flat keys", () => {
    expect(interpolate("ran for {n} min", { n: 8 })).toBe("ran for 8 min");
  });

  it("substitutes dotted paths", () => {
    expect(
      interpolate("class {a.b.c}", { a: { b: { c: "WAT_HYD" } } }),
    ).toBe("class WAT_HYD");
  });

  it("renders missing keys as ?", () => {
    expect(interpolate("ran for {n} min", {})).toBe("ran for ? min");
  });

  it("renders booleans as yes/no", () => {
    expect(interpolate("{ok}", { ok: true })).toBe("yes");
    expect(interpolate("{ok}", { ok: false })).toBe("no");
  });

  it("preserves non-placeholder text", () => {
    expect(interpolate("no vars here", { x: 1 })).toBe("no vars here");
  });
});
