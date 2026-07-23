import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

let terms: Record<string, unknown> | undefined;
let canManage = true;

vi.mock("@/features/talentAdmin/commercialHooks", () => ({
  useCommercialTerms: () => ({ data: terms, isPending: false }),
  useCanManageCommercialTerms: () => canManage,
  useSetCommercialTerms: () => ({ set: { mutateAsync: vi.fn(), isPending: false }, resetPayout: { mutateAsync: vi.fn(), isPending: false } }),
}));
vi.mock("@/features/admin/gradeHooks", () => ({ useTalentGrades: () => ({ data: [] }) }));

import CommercialTermsPanel from "@/features/talentAdmin/CommercialTermsPanel";

const CONFIGURED = {
  pricingMode: "GradeLinked", isConfigured: true, gradeId: "g1", gradeName: "Grade 2",
  clientHourlyRateMinor: 200_000, talentHourlyPayoutMinor: 100_000, grossMarginMinor: 100_000,
  gradeDefaultPayoutMinor: 100_000, payoutIsGradeDefault: true, currency: "ZAR", updatedAtUtc: null, updatedByUserId: null,
};

describe("CommercialTermsPanel", () => {
  beforeEach(() => { canManage = true; });

  it("shows the client rate, talent payout and gross margin when configured (staff view)", () => {
    terms = CONFIGURED;
    render(<CommercialTermsPanel profileId="p1" />);
    expect(screen.getByText(/Grade-linked — Grade 2/)).toBeInTheDocument();
    expect(screen.getByText(/Client \/ hour/)).toBeInTheDocument();
    expect(screen.getByText(/Talent payout \/ hour/)).toBeInTheDocument();
    expect(screen.getByText(/Gross margin \/ hour/)).toBeInTheDocument();
  });

  it("warns Pricing required when unconfigured", () => {
    terms = { pricingMode: "Unconfigured", isConfigured: false, currency: "ZAR", payoutIsGradeDefault: true,
      gradeId: null, gradeName: null, clientHourlyRateMinor: null, talentHourlyPayoutMinor: null,
      grossMarginMinor: null, gradeDefaultPayoutMinor: null, updatedAtUtc: null, updatedByUserId: null };
    render(<CommercialTermsPanel profileId="p1" />);
    expect(screen.getByText(/Pricing required/i)).toBeInTheDocument();
  });

  it("hides edit controls without the manage permission", () => {
    terms = CONFIGURED;
    canManage = false;
    render(<CommercialTermsPanel profileId="p1" />);
    expect(screen.queryByRole("button", { name: /^Edit$/i })).toBeNull();
  });
});
