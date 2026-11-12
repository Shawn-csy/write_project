import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_URL_STATE } from "@write/public-ui";
import type { PublicScript, ExternalPublicScript, PublicPersona } from "@/lib/types";
import { useGalleryController } from "./useGalleryController";
import { readPublicBundle } from "@/lib/readPublicBundle";

vi.mock("@/lib/readPublicBundle", () => ({ readPublicBundle: vi.fn() }));
vi.mock("@/lib/liveApi", () => ({
  liveApi: { read: vi.fn().mockResolvedValue({ response: { ok: false } }) },
}));

const mockReadBundle = vi.mocked(readPublicBundle);
const baseOptions = {
  initialScripts: [],
  initialExternalPublicScripts: [],
  initialUrlState: DEFAULT_URL_STATE,
};

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

it("loads both identity directories only after opening a people view", async () => {
  mockReadBundle.mockResolvedValue({
    data: {
      personas: [{ id: "p1", displayName: "作者甲", tags: ["劇本"], roles: ["scriptwriter"] }],
      organizations: [{ id: "o1", name: "社團甲", tags: [] }],
    },
    source: "primary",
  });
  // The authors directory lists only identities with a public work. The options
  // object must be stable: a fresh array each render re-seeds state forever.
  const options = {
    ...baseOptions,
    initialScripts: [{ id: "s1", title: "作品甲", tags: [], persona: { id: "p1", displayName: "作者甲" } }] as PublicScript[],
  };
  const { result } = renderHook(() => useGalleryController(options));
  expect(mockReadBundle).not.toHaveBeenCalled();

  act(() => {
    window.history.replaceState(null, "", "/authors");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  await waitFor(() => expect(result.current.peopleStatus).toBe("loaded"));
  expect(mockReadBundle).toHaveBeenCalledExactlyOnceWith(["personas", "organizations"]);
  expect(result.current.authors.some((author) => author.id === "p1")).toBe(true);
  expect(result.current.orgs.some((org) => org.id === "o1")).toBe(true);
});

it("lists a scriptwriter with a sourced commission profile", () => {
  const options = {
    ...baseOptions,
    initialPersonas: [{
      id: "wind", displayName: "風蓮/Hong Liân", roles: ["scriptwriter"],
      roleProfiles: { scriptwriter: { commissionOffers: [{ service: "台本師" }] } },
    }] as PublicPersona[],
    initialOrganizations: [],
    initialUrlState: { ...DEFAULT_URL_STATE, view: "authors" as const },
  };
  const { result } = renderHook(() => useGalleryController(options));
  expect(result.current.authors.some((author) => author.id === "wind")).toBe(true);
});

it("shows a retry state when the identity projection is incomplete", async () => {
  mockReadBundle.mockResolvedValue({ data: { personas: [] }, source: "primary" });
  const { result } = renderHook(() => useGalleryController({
    ...baseOptions,
    initialUrlState: { ...DEFAULT_URL_STATE, view: "authors" },
  }));
  act(() => {
    window.history.replaceState(null, "", "/authors");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await waitFor(() => expect(result.current.peopleStatus).toBe("error"));
});

it("filters local and external works to those with a Demo", () => {
  const initialScripts = [
    { id: "with-demo", title: "有試聽", hasDemo: true, tags: [] },
    { id: "without-demo", title: "沒有試聽", hasDemo: false, tags: [] },
  ] as PublicScript[];
  const initialExternalPublicScripts = [
    { id: "external-demo", title: "站外試聽", status: "published", demoLinks: [{ url: "https://example.com/demo" }] },
    { id: "external-none", title: "站外無試聽", status: "published" },
  ] as ExternalPublicScript[];
  const { result } = renderHook(() => useGalleryController({
    ...baseOptions,
    initialScripts,
    initialExternalPublicScripts,
  }));
  act(() => result.current.setDemoOnly(true));
  expect(result.current.homepageModel.filteredScripts.map((script) => script.id)).toEqual(["with-demo"]);
  expect(result.current.filteredExternalPublicScripts.map((script) => script.id)).toEqual(["external-demo"]);
  expect(result.current.homepageModel.filterChips).toContainEqual({ type: "demo", label: "有 Demo", value: "1" });
  expect(window.location.search).toBe("?demo=1");
});
