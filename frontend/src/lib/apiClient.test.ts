import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, apiJson } from "./apiClient";

describe("apiClient", () => {
  beforeEach(() => {
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes credentials on every request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/v1/anything");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe("include");
  });

  it("propagates the CSRF cookie as X-CSRFToken on mutating requests", async () => {
    document.cookie = "XSRF-TOKEN=test-token-abc";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/v1/auth/logout", { method: "POST" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRFToken")).toBe("test-token-abc");
  });

  it("does NOT send X-CSRFToken on GET", async () => {
    document.cookie = "XSRF-TOKEN=test-token-abc";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/v1/anything", { method: "GET" });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRFToken")).toBeNull();
  });

  it("raises ApiError with code+message on non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "bad_credentials", message: "nope" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiJson("/api/v1/auth/login")).rejects.toMatchObject({
      status: 401,
      code: "bad_credentials",
      message: "nope",
    });
  });

  it("ApiError instances carry status + code", () => {
    const err = new ApiError(409, "slug_taken", "taken");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(409);
    expect(err.code).toBe("slug_taken");
  });
});
