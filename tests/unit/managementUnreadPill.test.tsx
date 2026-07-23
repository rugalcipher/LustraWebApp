import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * The Management/Admin sidebar unread pill: a lightweight count on the Conversations item that is
 * hidden at zero, caps at 99+, and never blocks the shell when the count is unavailable.
 */

let summary: { totalUnreadMessages: number } | undefined = { totalUnreadMessages: 0 };

vi.mock("@/features/management/hooks", () => ({ useManagementUnreadSummary: () => ({ data: summary }) }));
vi.mock("@/features/talentApplication/hooks", () => ({ useTalentApplicationAttentionCount: () => ({ data: 0 }) }));
vi.mock("@/features/conversations/hooks", () => ({ useLiveConversationList: () => {} }));
vi.mock("@/lib/roleStore", () => ({ useRole: () => ({ user: { displayName: "Ops", email: "ops@lustra.test" } }) }));
vi.mock("@/auth/useHomeLink", () => ({ useHomeLink: () => "/admin" }));

import WorkspaceShell from "@/layouts/WorkspaceShell";

const NAV = [{ to: "/management-conversations", label: "Conversations", icon: "MessagesSquare" }];

function renderShell() {
  return render(
    <MemoryRouter>
      <WorkspaceShell nav={NAV} workspaceLabel="Concierge Console" />
    </MemoryRouter>
  );
}

describe("Management unread pill", () => {
  beforeEach(() => { summary = { totalUnreadMessages: 0 }; });

  it("is hidden when there are no unread messages", () => {
    summary = { totalUnreadMessages: 0 };
    renderShell();
    expect(screen.queryByLabelText(/unread messages/i)).toBeNull();
  });

  it("shows the count when there are unread messages", () => {
    summary = { totalUnreadMessages: 12 };
    renderShell();
    const pill = screen.getByLabelText("12 unread messages");
    expect(pill).toHaveTextContent("12");
  });

  it("caps the display at 99+", () => {
    summary = { totalUnreadMessages: 250 };
    renderShell();
    expect(screen.getByLabelText("250 unread messages")).toHaveTextContent("99+");
  });

  it("does not block the shell when the count is unavailable", () => {
    summary = undefined;
    renderShell();
    // The Conversations nav item still renders; no pill.
    expect(screen.getAllByText("Conversations").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/unread messages/i)).toBeNull();
  });
});
