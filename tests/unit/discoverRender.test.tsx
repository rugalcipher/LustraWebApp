import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Regression: the Discover route MUST mount without a runtime ReferenceError.
 *
 * ImmersiveTalentDiscovery called useRef(null) while importing only useState/useEffect/useCallback
 * from React, so `/app/discover` crashed in the browser with "useRef is not defined" — invisible to
 * tsc (checkJs is off for .jsx), to eslint (no-undef is off for the JSX config), to the bundler (a
 * bare identifier resolves only at runtime), and to the old immersive tests (which asserted against
 * the file's SOURCE TEXT and never mounted the component). This test actually mounts the page, so it
 * executes every hook — including useRef — and would have thrown before the import fix.
 */

// A minimal but faithful discover state that renders the grid empty-state path. Every field the
// component reads before its return branches is present; the hooks (incl. useRef) all execute.
const discoverState = () => ({
  loaded: true,
  gate: null,
  totalCount: 0,
  findLoadedTalent: () => null,
  results: [],
  current: null,
  currentStory: null,
  currentIndex: 0,
  slideIndex: 0,
  mode: "grid",
  direction: 0,
  query: "",
  sort: "relevance",
  filters: { city: null, category: null, travel: "no" },
  recentlyViewed: [],
  activeFilterCount: 0,
  totalSlides: 0,
  setQuery: vi.fn(),
  setSort: vi.fn(),
  setFilters: vi.fn(),
  setMode: vi.fn(),
  goNextTalent: vi.fn(),
  goPrevTalent: vi.fn(),
  undoSkip: vi.fn(),
  goToTalent: vi.fn(),
  goNextSlide: vi.fn(),
  goPrevSlide: vi.fn(),
  goToSlide: vi.fn(),
  resetFilters: vi.fn(),
});

vi.mock("@/components/lustra/immersive/useDiscoverState", () => ({
  useDiscoverState: () => discoverState(),
  usePrefersReducedMotion: () => false,
}));

vi.mock("@/layouts/AppShell", () => ({
  useSavedTalent: () => ({ isSaved: () => false, toggle: vi.fn() }),
}));

vi.mock("@/features/conversations/useMessageAction", () => ({
  useMessageAction: () => vi.fn(),
}));

import Discover from "@/pages/Discover";

describe("Discover route mounts", () => {
  it("renders the discovery page without a ReferenceError (useRef is imported)", () => {
    // If useRef were not imported, mounting would throw here and fail the test.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/app/discover"]}>
          <Discover />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // The toolbar and the empty state prove the component mounted fully, past the useRef call.
    expect(screen.getByPlaceholderText(/Search talent, city, category/i)).toBeInTheDocument();
    expect(screen.getByText(/No talent matches these preferences/i)).toBeInTheDocument();
  });

  it("has useRef in the React import of the immersive component", () => {
    // A cheap belt-and-braces guard alongside the real render above.
    const source = require("node:fs").readFileSync(
      require("node:path").resolve(process.cwd(), "src/components/lustra/immersive/ImmersiveTalentDiscovery.jsx"),
      "utf8"
    );
    const reactImport = source.split("\n").find((l: string) => l.includes('from "react"')) ?? "";
    expect(reactImport).toContain("useRef");
  });
});
