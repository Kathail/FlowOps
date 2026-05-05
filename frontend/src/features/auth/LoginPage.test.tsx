import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LoginPage } from "./LoginPage";

function renderLogin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/:slug/*" element={<div data-testid="tenant-home" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LoginPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    document.cookie = "";
  });

  it("renders the form", () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/company slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("on success, navigates to the tenant home", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
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
    );
    vi.stubGlobal("fetch", fetchMock);

    renderLogin();
    await userEvent.type(screen.getByLabelText(/company slug/i), "acme");
    await userEvent.type(screen.getByLabelText(/email/i), "a@acme.io");
    await userEvent.type(screen.getByLabelText(/password/i), "AnyP@ssword123");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId("tenant-home")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/login",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("shows the error message on bad credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { code: "bad_credentials", message: "nope" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderLogin();
    await userEvent.type(screen.getByLabelText(/company slug/i), "acme");
    await userEvent.type(screen.getByLabelText(/email/i), "a@acme.io");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/invalid/i);
    });
  });
});
