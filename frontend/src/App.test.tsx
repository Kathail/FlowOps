import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({ db: "ok", version: "test-sha" }),
      }),
    );
  });

  it("renders the shell and shows the health response", async () => {
    render(<App />);
    expect(screen.getByText("FlowOps")).toBeInTheDocument();
    expect(screen.getByText("Sprint 0 — health check")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/test-sha/)).toBeInTheDocument();
    });
  });
});
