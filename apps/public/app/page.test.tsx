/**
 * Homepage server component contract tests — Phase 1–3.
 *
 * Phase 1 (done): force-dynamic, fetchBundle partial failure isolation.
 * Phase 2 (done): useSearchParams() removed; server parses searchParams.
 * Phase 3 (transitional): GalleryServerContent passes /read/ links as children
 *   to GalleryClient, which hides them after hydration. This is not the final
 *   architecture — see docs/public-homepage-ssr-data-architecture.md Phase 4.
 *
 * Tests here verify:
 * - GalleryClient receives initialScripts from server.
 * - GalleryServerContent /read/ links are present in initial render (via children).
 * - Banner parse failure does not affect initialScripts.
 * - Network failure renders without crash.
 * - No 最新公開台本 fallback section (removed in Phase 1).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("@/lib/api", () => ({ apiFetch: vi.fn() }));
vi.mock("@write/public-ui/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@write/public-ui/server")>();
  return { ...actual, parseBannerSlides: vi.fn(() => undefined) };
});
vi.mock("@/lib/jsonLd", () => ({
  JsonLdScript: () => null,
}));
vi.mock("./GalleryClient", () => ({
  GalleryClient: ({ initialScripts, children }: { initialScripts: unknown[]; children?: React.ReactNode }) => (
    <div data-testid="gallery-client" data-script-count={initialScripts.length}>{children}</div>
  ),
}));
vi.mock("./loading", () => ({ default: () => <div /> }));

import { apiFetch } from "@/lib/api";
import { parseBannerSlides } from "@write/public-ui/server";
import HomePage from "./page";

const mockApiFetch = vi.mocked(apiFetch);
const mockParseBannerSlides = vi.mocked(parseBannerSlides);

const SCRIPTS = [
  { id: "script-1", title: "台本A", persona: { displayName: "作者A" } },
  { id: "script-2", title: "台本B", persona: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockParseBannerSlides.mockReturnValue(undefined);
});

const EMPTY_SEARCH_PARAMS = Promise.resolve({} as Record<string, string | string[] | undefined>);

async function renderPage() {
  const jsx = await HomePage({ searchParams: EMPTY_SEARCH_PARAMS });
  return render(jsx as React.ReactElement);
}

describe("homepage server component", () => {
  it("passes initialScripts to GalleryClient when bundle loads", async () => {
    mockApiFetch.mockResolvedValue({ scripts: SCRIPTS });
    await renderPage();
    const client = screen.getByTestId("gallery-client");
    expect(client.getAttribute("data-script-count")).toBe("2");
  });

  it("banner parse failure does not affect initialScripts passed to GalleryClient", async () => {
    mockApiFetch.mockResolvedValue({ scripts: SCRIPTS, banner: { corrupt: true } });
    mockParseBannerSlides.mockImplementation(() => { throw new Error("bad banner"); });
    await renderPage();
    const client = screen.getByTestId("gallery-client");
    expect(client.getAttribute("data-script-count")).toBe("2");
  });

  it("network failure renders page without crash, GalleryClient gets empty scripts", async () => {
    mockApiFetch.mockRejectedValue(new Error("network error"));
    await renderPage();
    const client = screen.getByTestId("gallery-client");
    expect(client.getAttribute("data-script-count")).toBe("0");
  });

  it("no 最新公開台本 fallback section in DOM (removed in Phase 1)", async () => {
    mockApiFetch.mockResolvedValue({ scripts: SCRIPTS });
    const { container } = await renderPage();
    expect(container.querySelector("section[aria-label='最新公開台本']")).toBeNull();
  });

  it("GalleryServerContent /read/ links present in initial render as children (Phase 3 transitional)", async () => {
    mockApiFetch.mockResolvedValue({ scripts: SCRIPTS });
    const { container } = await renderPage();
    // GalleryServerContent renders inside GalleryClient children.
    // Mock passes children through so links are in the DOM.
    const links = container.querySelectorAll("a[href^='/read/']");
    expect(links.length).toBe(2);
    const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/read/script-1");
    expect(hrefs).toContain("/read/script-2");
  });
});
