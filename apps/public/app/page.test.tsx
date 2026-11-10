/**
 * Homepage server component contract tests — Phase 1–4.
 *
 * Phase 1: force-dynamic, fetchBundle partial failure isolation.
 * Phase 2: useSearchParams() removed; server parses searchParams.
 * Phase 3: (superseded by Phase 4)
 * Phase 4: ScriptGalleryCardFrame shared between server SSR and client hydration.
 *   GalleryClient SSRs its full card grid (no BAILOUT_TO_CLIENT_SIDE_RENDERING).
 *   No separate GalleryServerContent / children pattern needed.
 *
 * Tests here verify:
 * - GalleryClient receives initialScripts and initialUrlState from server.
 * - Banner parse failure does not affect initialScripts.
 * - Network failure renders without crash.
 * - No 最新公開台本 fallback section.
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
  GalleryClient: ({ initialScripts, initialPersonas, initialOrganizations, initialUrlState }: {
    initialScripts: unknown[]; initialPersonas?: unknown[]; initialOrganizations?: unknown[]; initialUrlState: unknown;
  }) => (
    <div data-testid="gallery-client" data-script-count={initialScripts.length}
      data-persona-count={initialPersonas?.length ?? 0} data-org-count={initialOrganizations?.length ?? 0}
      data-people-preloaded={initialPersonas !== undefined && initialOrganizations !== undefined}
      data-has-url-state={initialUrlState != null} />
  ),
}));

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

async function renderPage(searchParams = EMPTY_SEARCH_PARAMS) {
  const jsx = await HomePage({ searchParams });
  return render(jsx as React.ReactElement);
}

describe("homepage server component", () => {
  it("omits people directories from the initial script gallery bundle", async () => {
    mockApiFetch.mockResolvedValue({ scripts: SCRIPTS, personas: [{ id: "p1" }], organizations: [{ id: "o1" }] });
    await renderPage();
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/public-bundle?sections=scripts,externalPublicScripts,activityPages,demoSubmissions,banner",
      expect.anything(),
    );
    expect(screen.getByTestId("gallery-client").getAttribute("data-people-preloaded")).toBe("false");
  });

  it("preloads public identities for a direct people view", async () => {
    mockApiFetch.mockResolvedValue({ scripts: [], personas: [{ id: "p1" }], organizations: [{ id: "o1" }] });
    await renderPage(Promise.resolve({ view: "orgs" }));
    const client = screen.getByTestId("gallery-client");
    expect(client.getAttribute("data-persona-count")).toBe("1");
    expect(client.getAttribute("data-org-count")).toBe("1");
    expect(client.getAttribute("data-people-preloaded")).toBe("true");
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/public-bundle?sections=scripts,externalPublicScripts,personas,organizations,activityPages,demoSubmissions,banner",
      expect.anything(),
    );
  });

  it("passes initialScripts to GalleryClient when bundle loads", async () => {
    mockApiFetch.mockResolvedValue({ scripts: SCRIPTS });
    await renderPage();
    const client = screen.getByTestId("gallery-client");
    expect(client.getAttribute("data-script-count")).toBe("2");
  });

  it("passes initialUrlState to GalleryClient (server-parsed searchParams)", async () => {
    mockApiFetch.mockResolvedValue({ scripts: SCRIPTS });
    await renderPage();
    const client = screen.getByTestId("gallery-client");
    expect(client.getAttribute("data-has-url-state")).toBe("true");
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

  it("no 最新公開台本 fallback section in DOM", async () => {
    mockApiFetch.mockResolvedValue({ scripts: SCRIPTS });
    const { container } = await renderPage();
    expect(container.querySelector("section[aria-label='最新公開台本']")).toBeNull();
  });
});
