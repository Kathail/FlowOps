import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminInvitationsPage } from "./AdminInvitationsPage";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/acme/admin/invitations"]}>
        <Routes>
          <Route path="/:slug/admin/invitations" element={<AdminInvitationsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AdminInvitationsPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
        const u = typeof url === "string" ? url : (url as Request).url;
        if (u === "/api/v1/invitations" && (!init?.method || init.method === "GET")) {
          return new Response(
            JSON.stringify({
              items: [
                {
                  id: 1,
                  email: "alice@acme.io",
                  full_name: "Alice",
                  role_codes: ["tech"],
                  token_prefix: "abcd1234",
                  expires_at: new Date(Date.now() + 86400e3).toISOString(),
                  accepted_at: null,
                  revoked_at: null,
                  invited_by: 1,
                  created_at: new Date().toISOString(),
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (u === "/api/v1/invitations" && init?.method === "POST") {
          return new Response(
            JSON.stringify({
              invitation: {
                id: 2,
                email: "bob@acme.io",
                full_name: null,
                role_codes: ["tech"],
                token_prefix: "tok12345",
                expires_at: new Date(Date.now() + 86400e3).toISOString(),
                accepted_at: null,
                revoked_at: null,
                invited_by: 1,
                created_at: new Date().toISOString(),
              },
              token: "tok12345-rest-of-token",
              accept_url: "http://example.test/accept-invitation/tok12345-rest-of-token",
            }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response("not found", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists existing invitations", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("alice@acme.io")).toBeInTheDocument();
    });
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("submits a new invitation and surfaces the accept URL", async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("alice@acme.io")).toBeInTheDocument();
    });

    const email = screen.getByLabelText(/email/i) as HTMLInputElement;
    await user.type(email, "bob@acme.io");
    await user.click(screen.getByRole("button", { name: /send invitation/i }));

    await waitFor(() => {
      expect(screen.getByText(/Invitation created for bob@acme\.io/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/accept-invitation\/tok12345-rest-of-token/)).toBeInTheDocument();
  });
});
