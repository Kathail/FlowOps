import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRelative } from "./format";

describe("formatDateTime", () => {
  it("returns empty string for null / undefined / empty", () => {
    expect(formatDateTime(null)).toBe("");
    expect(formatDateTime(undefined)).toBe("");
    expect(formatDateTime("")).toBe("");
  });

  it("returns empty string for unparseable input rather than 'Invalid Date'", () => {
    expect(formatDateTime("nonsense")).toBe("");
  });

  it("formats an ISO timestamp into a readable date+time", () => {
    // Don't assert exact string (locale/timezone vary in CI); just
    // verify a non-empty result and that the year is present.
    const out = formatDateTime("2026-05-06T14:30:00Z");
    expect(out).not.toBe("");
    expect(out).toContain("2026");
  });
});

describe("formatDate", () => {
  it("returns empty string for null / undefined / empty", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
  });

  it("formats date-only ISO strings", () => {
    const out = formatDate("2026-05-06");
    expect(out).toContain("2026");
    expect(out).toContain("May");
  });
});

describe("formatRelative", () => {
  it("returns empty string for null / unparseable", () => {
    expect(formatRelative(null)).toBe("");
    expect(formatRelative("nonsense")).toBe("");
  });

  it("renders a past timestamp as a past relative time", () => {
    const past = new Date(Date.now() - 5 * 60_000).toISOString();
    const out = formatRelative(past);
    expect(out).toMatch(/ago|minute/i);
  });

  it("renders a future timestamp as a future relative time", () => {
    const future = new Date(Date.now() + 2 * 3600_000).toISOString();
    const out = formatRelative(future);
    expect(out.length).toBeGreaterThan(0);
  });
});
