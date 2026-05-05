import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";

function renderGuarded() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/acme/"]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login" />} />
          <Route
            path="/:slug/*"
            element={
              <RequireAuth>
                <div data-testid="protected" />
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    document.cookie = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects to /login when /auth/me returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "unauthorized", message: "nope" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderGuarded();

    await waitFor(() => {
      expect(screen.getByTestId("login")).toBeInTheDocument();
    });
  });

  it("renders children when /auth/me succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            user: {
              user_uid: "u1",
              email: "a@acme.io",
              full_name: "A",
              phone: null,
              is_active: true,
              last_login_at: null,
              created_at: "",
              updated_at: "",
              roles: [],
            },
            tenant: {
              id: 1,
              name: "Acme",
              slug: "acme",
              settings: {},
              created_at: "",
              updated_at: "",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    renderGuarded();

    await waitFor(() => {
      expect(screen.getByTestId("protected")).toBeInTheDocument();
    });
  });
});
