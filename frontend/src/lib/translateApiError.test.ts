import { describe, expect, it } from "vitest";
import { ApiError } from "./apiClient";
import { translateApiError } from "./translateApiError";

describe("translateApiError", () => {
  it.each([
    ["bad_credentials", /Invalid tenant/],
    ["slug_taken", /slug is already taken/],
    ["forbidden", /don't have permission/],
    ["unauthorized", /session expired/],
    ["conflict", /Someone else updated/],
  ])("translates known code %s", (code, pattern) => {
    expect(translateApiError(new ApiError(400, code, "raw"))).toMatch(pattern);
  });

  it("falls back to the API's prose message for unknown codes", () => {
    expect(translateApiError(new ApiError(400, "unknown_thing", "Asset uid must be unique"))).toBe(
      "Asset uid must be unique",
    );
  });

  it("never leaks Error objects from non-API failures", () => {
    const out = translateApiError(new TypeError("Cannot read property 'x' of undefined"));
    expect(out).not.toMatch(/TypeError|undefined/);
    expect(out).toMatch(/something went wrong|try again/i);
  });

  it("handles unknown values (string thrown, null, etc.) without crashing", () => {
    expect(translateApiError("oops" as unknown)).toMatch(/something went wrong/i);
    expect(translateApiError(null)).toMatch(/something went wrong/i);
    expect(translateApiError(undefined)).toMatch(/something went wrong/i);
  });
});
