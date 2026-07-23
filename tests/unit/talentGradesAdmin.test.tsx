import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { formatMinor } from "@/services/talentGradeService";

let canManage = true;
const grades = [
  { id: "g1", name: "Grade 1", rank: 1, currencyCode: "ZAR", clientHourlyRateMinor: 100_000, defaultTalentSharePercent: 50, defaultTalentPayoutMinor: 50_000, isActive: true, assignedTalentCount: 3, createdAtUtc: "", updatedAtUtc: null },
  { id: "g2", name: "Grade 2", rank: 2, currencyCode: "ZAR", clientHourlyRateMinor: 200_000, defaultTalentSharePercent: 50, defaultTalentPayoutMinor: 100_000, isActive: false, assignedTalentCount: 0, createdAtUtc: "", updatedAtUtc: null },
];

vi.mock("@/features/admin/gradeHooks", () => ({
  useTalentGrades: () => ({ data: grades, isPending: false }),
  useCanManageGrades: () => canManage,
  useCreateGrade: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateGrade: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useArchiveGrade: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRestoreGrade: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import TalentGradesSection from "@/features/admin/TalentGradesSection";

describe("formatMinor", () => {
  it("formats minor units as rand currency, no cents", () => {
    expect(formatMinor(100_000, "ZAR")).toMatch(/1[ , ]?000/);
    expect(formatMinor(null)).toBe("—");
  });
});

describe("TalentGradesSection", () => {
  it("lists grades with client rate, share and default payout", () => {
    canManage = true;
    render(<TalentGradesSection />);
    expect(screen.getByText("Grade 1")).toBeInTheDocument();
    expect(screen.getByText("Grade 2")).toBeInTheDocument();
    // Both grades show a 50% share.
    expect(screen.getAllByText("50%").length).toBe(2);
    // Grade 2 is archived.
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows management controls only with the manage permission", () => {
    canManage = true;
    const { unmount } = render(<TalentGradesSection />);
    expect(screen.getByRole("button", { name: /Add grade/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit Grade 1/i })).toBeInTheDocument();
    unmount();

    canManage = false;
    render(<TalentGradesSection />);
    expect(screen.queryByRole("button", { name: /Add grade/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Edit Grade 1/i })).toBeNull();
  });
});
