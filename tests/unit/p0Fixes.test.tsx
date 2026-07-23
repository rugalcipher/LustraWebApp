import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { queryClientInstance } from "@/lib/query-client";
import { ApiError } from "@/api/problemDetails";

/**
 * P0 UAT correction guards: React Query must not retry 401/403 (the auth "retry storm"), the
 * frontend must allow same-origin geolocation, and the Message/Inquire bridge must fire and never
 * hang forever on "Connecting you to Lustra management".
 */

describe("query retry policy", () => {
  const retry = queryClientInstance.getDefaultOptions().queries?.retry as
    | ((count: number, error: unknown) => boolean)
    | undefined;

  it("never retries a 401 or 403", () => {
    expect(typeof retry).toBe("function");
    expect(retry!(0, new ApiError({ status: 401, kind: "unauthorized" }))).toBe(false);
    expect(retry!(0, new ApiError({ status: 403, kind: "forbidden" }))).toBe(false);
  });

  it("retries a server error once", () => {
    expect(retry!(0, new ApiError({ status: 500, kind: "server" }))).toBe(true);
    expect(retry!(1, new ApiError({ status: 500, kind: "server" }))).toBe(false);
  });
});

describe("geolocation permissions policy", () => {
  it("allows same-origin geolocation in vercel.json", () => {
    const config = JSON.parse(readFileSync(path.resolve(process.cwd(), "vercel.json"), "utf8"));
    const header = config.headers
      .flatMap((h: { headers: { key: string; value: string }[] }) => h.headers)
      .find((h: { key: string }) => h.key === "Permissions-Policy");
    expect(header.value).toContain("geolocation=(self)");
    expect(header.value).not.toContain("geolocation=()");
    // Still no blanket wildcard.
    expect(header.value).not.toContain("geolocation=*");
  });
});

// --- Message/Inquire bridge --------------------------------------------------

const navigate = vi.fn();
const mutateAsync = vi.fn();
let profileState: Record<string, unknown> = {};
let pending = false;

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ slug: "aria" }),
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  };
});

vi.mock("@/features/discovery/hooks", () => ({
  useTalentProfile: () => profileState,
}));

vi.mock("@/features/conversations/hooks", () => ({
  useStartConversation: () => ({ mutateAsync, isPending: pending }),
}));

import StartConversation from "@/pages/StartConversation";

describe("StartConversation bridge", () => {
  beforeEach(() => {
    navigate.mockClear();
    mutateAsync.mockReset();
    pending = false;
    profileState = {};
  });

  it("fires the start-conversation mutation and navigates once the talent resolves", async () => {
    profileState = {
      talent: { talentProfileId: "p1", name: "Aria", slug: "aria" },
      isLoading: false, isError: false, error: null, notFound: false,
    };
    mutateAsync.mockResolvedValue({ conversationId: "c1" });

    render(<StartConversation />);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith("p1"));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/app/messages/c1", expect.objectContaining({ replace: true }))
    );
  });

  it("does not hang: a failed start shows an error with Retry", async () => {
    profileState = {
      talent: { talentProfileId: "p1", name: "Aria", slug: "aria" },
      isLoading: false, isError: false, error: null, notFound: false,
    };
    mutateAsync.mockRejectedValue(new ApiError({ status: 500, kind: "server" }));

    render(<StartConversation />);

    await screen.findByText(/Couldn't open the conversation/i);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("retry re-fires the mutation", async () => {
    profileState = {
      talent: { talentProfileId: "p1", name: "Aria", slug: "aria" },
      isLoading: false, isError: false, error: null, notFound: false,
    };
    mutateAsync.mockRejectedValueOnce(new ApiError({ status: 500, kind: "server" }));
    mutateAsync.mockResolvedValueOnce({ conversationId: "c2" });

    render(<StartConversation />);
    const retryBtn = await screen.findByRole("button", { name: /retry/i });
    await userEvent.click(retryBtn);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/app/messages/c2", expect.anything()));
  });
});
