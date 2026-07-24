import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/api/problemDetails";
import * as applications from "@/services/talentApplicationService";

/**
 * Field-level API validation must land ON the field (and its wizard step), never as a bare
 * "one or more validation errors occurred". A blank optional short biography must also let the
 * applicant advance. These render the real wizard and drive it through the API call.
 */

// A linked (signed-in) applicant skips the password step; email is taken from the account.
vi.mock("@/auth/PrincipalContext", () => ({
  usePrincipal: () => ({
    principal: { source: "real", userId: "u1", email: "ada@example.com", isAuthenticated: true },
  }),
}));
vi.mock("@/features/auth/passwordPolicy", () => ({ usePasswordPolicy: () => ({ rules: [] }) }));
// Keep the render light and offline.
vi.mock("@/components/lustra/public/PublicMarketingLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/address/AddressAutocomplete", () => ({ default: () => <div data-testid="addr" /> }));

import TalentApplication from "@/pages/TalentApplication";

// jsdom does not implement scrollIntoView (used by the wizard's step-change scroll and by the
// field-focus reveal). Stub it so the real component can run.
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
}

function fill(id: string, value: string) {
  const el = document.getElementById(id) as HTMLInputElement;
  fireEvent.change(el, { target: { value } });
}

async function advanceToPublicProfile() {
  render(
    <MemoryRouter>
      <TalentApplication />
    </MemoryRouter>
  );
  fill("legalFirstName", "Ada");
  fill("legalSurname", "Lovelace");
  fill("cellphoneNumber", "+27 82 000 0000");
  fill("dateOfBirth", "1990-01-01");
  fireEvent.click(screen.getByRole("checkbox", { name: /I confirm I am 18/i }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I consent to Lustra contacting/i }));
  fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
  await screen.findByLabelText(/Display \/ stage name/i);
}

describe("application field-level API errors", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("lands a server field error on its field, not a generic banner, and preserves data", async () => {
    vi.spyOn(applications, "createApplication").mockRejectedValue(
      ApiError.fromProblem(400, {
        title: "One or more validation errors occurred.",
        errors: { RequestedDisplayName: ["That display name is taken."] },
      } as never)
    );

    await advanceToPublicProfile();
    fill("requestedDisplayName", "Ada");           // valid client-side
    // Short biography left BLANK (it is optional) — must not block the request.
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // The exact field message is shown…
    expect(await screen.findByText(/That display name is taken\./i)).toBeInTheDocument();
    // …and the generic model-binding title is NOT surfaced as the whole story.
    expect(screen.queryByText(/one or more validation errors/i)).toBeNull();
    // Entered data is preserved.
    expect((document.getElementById("requestedDisplayName") as HTMLInputElement).value).toBe("Ada");
  });

  it("advances past a blank optional short biography when the API accepts it", async () => {
    const created = vi.spyOn(applications, "createApplication").mockResolvedValue({
      applicationId: "app-1",
      reference: "LA-1",
      status: "Draft",
      accessToken: "tok",
      accessTokenExpiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
      minimumPhotographs: 3,
      maximumPhotographs: 8,
    } as never);

    await advanceToPublicProfile();
    fill("requestedDisplayName", "Ada");
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // The request went out with a NULL short biography, and the wizard left the profile step.
    await waitFor(() => expect(created).toHaveBeenCalled());
    expect(created.mock.calls[0][0].shortBiography).toBeNull();
    await waitFor(() =>
      expect(screen.queryByLabelText(/Display \/ stage name/i)).toBeNull()
    );
  });
});
