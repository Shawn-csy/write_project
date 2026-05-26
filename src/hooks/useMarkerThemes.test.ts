import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMarkerThemes } from "./useMarkerThemes";

const mockApiCall = vi.fn();
const mockFetchPublic = vi.fn();
const mockGetDefaultMarkerConfigsAdmin = vi.fn();

vi.mock("../services/settingsApi", () => ({
  apiCall: (...args: unknown[]) => mockApiCall(...args),
}));

vi.mock("../lib/api/client", () => ({
  fetchPublic: (...args: unknown[]) => mockFetchPublic(...args),
}));

vi.mock("../lib/api/admin", () => ({
  getDefaultMarkerConfigsAdmin: (...args: unknown[]) => mockGetDefaultMarkerConfigsAdmin(...args),
}));

vi.mock("./useDebouncedAutosave", () => ({
  useDebouncedAutosave: vi.fn(),
}));

describe("useMarkerThemes default theme save permissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPublic.mockResolvedValue([]);
    mockGetDefaultMarkerConfigsAdmin.mockResolvedValue([]);
  });

  it("throws for non-admin when saving default marker configs", async () => {
    const currentUser = { uid: "u1" };
    const { result } = renderHook(() => useMarkerThemes(currentUser, false));

    await waitFor(() => {
      expect(result.current.currentThemeId).toBe("default");
    });

    await expect(
      result.current.setMarkerConfigs([
        { id: "rule-a", label: "A", type: "block", matchMode: "prefix", start: "//A", isBlock: true },
      ] as never)
    ).rejects.toThrow("只有超級管理員可以修改系統預設設定");

    expect(mockApiCall).not.toHaveBeenCalled();
  });

  it("allows admin to save default marker configs via /admin/default-marker-configs", async () => {
    const currentUser = { uid: "admin-1" };
    const { result } = renderHook(() => useMarkerThemes(currentUser, true));

    await waitFor(() => {
      expect(result.current.currentThemeId).toBe("default");
    });

    await act(async () => {
      await result.current.setMarkerConfigs([
        { id: "rule-b", label: "B", type: "block", matchMode: "prefix", start: "//B", isBlock: true },
      ] as never);
    });

    expect(mockApiCall).toHaveBeenCalledWith(
      currentUser,
      "/admin/default-marker-configs",
      "PUT",
      expect.any(Array)
    );
  });
});

