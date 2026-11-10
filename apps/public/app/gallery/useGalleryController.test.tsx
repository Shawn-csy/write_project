import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_URL_STATE } from "@write/public-ui";
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
  const { result } = renderHook(() => useGalleryController(baseOptions));
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
