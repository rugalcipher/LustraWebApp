import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

/**
 * The split guest teaser vs authenticated detail, and the detail's content/header rules:
 * full profile for a member, no share/save header, no zero-value metrics, working Message.
 */

const navigate = vi.fn();
const messageFn = vi.fn();
let profile: Record<string, unknown> = {};
let reviews: unknown[] = [];

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate, useParams: () => ({ id: "aria" }) };
});
vi.mock("@/features/discovery/hooks", () => ({
  useTalentProfile: () => ({ talent: profile, isLoading: false, gate: null, notFound: false }),
  useTalentReviews: () => ({ reviews }),
  useDiscoveryPolicy: () => ({ data: {} }),
}));
vi.mock("@/features/conversations/useMessageAction", () => ({ useMessageAction: () => messageFn }));

import TalentDetail from "@/pages/TalentDetail";
import TalentTeaser from "@/pages/TalentTeaser";

const TALENT = {
  slug: "aria", talentProfileId: "p1", name: "Aria", age: 27, headline: "Art curator",
  city: "Cape Town", region: "Western Cape", availability: "Available", verified: true,
  startingRate: 1200, startingRateCurrency: "ZAR", ratesDisclaimer: "Rates are indicative.",
  rates: [{ label: "Evening", unit: "Hour", amount: 1200, currency: "ZAR", notes: "" }],
  fullBio: "A distinctive full biography about Aria and her work.",
  bio: "Short bio", category: "Host", categories: ["Host", "Companion"],
  languages: ["English", "Zulu"], skills: ["Hosting"], interests: ["Art"], engagements: ["Dinners"],
  travel: true, eventAvailable: true, tags: ["Warm", "Elegant"],
  galleryImages: [{ id: "a", url: "https://x/a.jpg" }, { id: "b", url: "https://x/b.jpg" }],
  coverImage: { id: "a", url: "https://x/a.jpg" }, distanceKm: null, rating: 0, reviews: 0,
};

function renderPage(Page: React.ComponentType) {
  return render(<MemoryRouter><Page /></MemoryRouter>);
}

describe("authenticated TalentDetail", () => {
  beforeEach(() => { profile = { ...TALENT }; reviews = []; navigate.mockClear(); messageFn.mockClear(); });

  it("renders the full profile — biography, locality, languages — with a Message action", () => {
    renderPage(TalentDetail);
    expect(screen.getByText(/distinctive full biography/i)).toBeInTheDocument();
    expect(screen.getByText(/Cape Town/)).toBeInTheDocument();
    expect(screen.getByText(/English · Zulu/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Message$/i })).toBeInTheDocument();
  });

  it("has only a Back control in the header — no Share, no Save/Like", () => {
    renderPage(TalentDetail);
    expect(screen.getByRole("button", { name: /Back to discovery/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /share/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /save|remove from saved|like/i })).toBeNull();
  });

  it("shows no rating/stars and no empty review block when there are no reviews", () => {
    renderPage(TalentDetail);
    expect(screen.queryByText(/Reviews/)).toBeNull();
    expect(screen.queryByText("0.0")).toBeNull();
    // No "0 completed engagements" / empty statistic anywhere.
    expect(screen.queryByText(/0 (completed|bookings|engagements)/i)).toBeNull();
  });

  it("never renders private address or coordinates (absent from the public DTO)", () => {
    renderPage(TalentDetail);
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/-?\d{1,3}\.\d{4,}/); // no raw coordinates
    expect(html).not.toMatch(/Place ?ID|googlePlaceId/i);
  });

  it("Back returns to discovery (falls back to /app/discover with no history key)", async () => {
    renderPage(TalentDetail);
    await userEvent.click(screen.getByRole("button", { name: /Back to discovery/i }));
    expect(navigate).toHaveBeenCalledWith("/app/discover");
  });

  it("Message triggers the message action", async () => {
    renderPage(TalentDetail);
    await userEvent.click(screen.getByRole("button", { name: /^Message$/i }));
    expect(messageFn).toHaveBeenCalled();
  });
});

describe("guest TalentTeaser", () => {
  beforeEach(() => { profile = { ...TALENT }; reviews = []; navigate.mockClear(); });

  it("is a teaser with a login invitation and no client-only actions", () => {
    renderPage(TalentTeaser);
    expect(screen.getByRole("button", { name: /Log in to view the full profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Message$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /share|save/i })).toBeNull();
  });

  it("login preserves the talent slug for return to the authenticated route", async () => {
    renderPage(TalentTeaser);
    await userEvent.click(screen.getByRole("button", { name: /Log in to view the full profile/i }));
    expect(navigate).toHaveBeenCalledWith("/login", { state: { from: "/app/talent/aria" } });
  });
});

// ---- P0: Message footer must sit ABOVE the client bottom navigation ----------
describe("detail layout: Message footer clears the bottom nav; headers clear the notch", () => {
  beforeEach(() => { profile = { ...TALENT }; reviews = []; navigate.mockClear(); messageFn.mockClear(); });

  it("positions the Message footer with client-action-footer, NOT fixed bottom-0", () => {
    const { container } = renderPage(TalentDetail);
    const footer = screen.getByTestId("talent-detail-action-footer");
    // The footer opts into the shared utility that sits above the nav + safe-area…
    expect(footer.className).toContain("client-action-footer");
    // …and must NOT pin itself to the very bottom, which is where the nav lives.
    expect(footer.className).not.toMatch(/\bbottom-0\b/);
    // The page reserves room for BOTH the footer and the nav so content isn't hidden.
    expect(container.querySelector(".pb-client-action")).not.toBeNull();
  });

  it("keeps the Message button clickable and a comfortable touch target", async () => {
    renderPage(TalentDetail);
    const btn = screen.getByRole("button", { name: /^Message$/i });
    expect(btn.className).toContain("min-h-[44px]");
    await userEvent.click(btn);
    expect(messageFn).toHaveBeenCalled();
  });

  it("gives both detail headers deliberate top safe-area spacing (not a bare safe-top)", () => {
    const auth = renderPage(TalentDetail);
    expect(auth.container.querySelector(".safe-top-spaced")).not.toBeNull();
    auth.unmount();
    const guest = renderPage(TalentTeaser);
    expect(guest.container.querySelector(".safe-top-spaced")).not.toBeNull();
  });

  it("defines the shared client-nav-height token and footer/padding utilities in the stylesheet", () => {
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
    expect(css).toContain("--client-nav-height");
    expect(css).toContain(".client-action-footer");
    expect(css).toContain(".pb-client-action");
    expect(css).toContain(".safe-top-spaced");
  });
});
