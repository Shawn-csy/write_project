import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataLifecycle } from "./useScriptMetadataLifecycle";

vi.mock("../../lib/api/scripts", () => ({
  getScript: vi.fn(),
}));

import { getScript } from "../../lib/api/scripts";

const setter = () => vi.fn();

const buildProps = (overrides = {}) => ({
  open: false,
  scriptId: "",
  script: null,
  localScript: null,
  setLocalScript: setter(),
  hydrateScriptState: vi.fn(),
  initializedRef: { current: false },
  userEditedRef: { current: true },
  contactAutoFilledRef: { current: true },
  publicLoadedRef: { current: "s-1" },
  setActiveTab: setter(),
  setIsInitializing: setter(),
  setIsMediaPickerOpen: setter(),
  setCoverPreviewFailed: setter(),
  setCoverUploadError: setter(),
  setCoverUploadWarning: setter(),
  setShowAllChecklistChips: setter(),
  setSeriesExpanded: setter(),
  setShowSeriesQuickCreate: setter(),
  setShowValidationHints: setter(),
  setShowPersonaSetupDialog: setter(),
  ...overrides,
});

describe("useScriptMetadataLifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets transient state and refs when dialog closes", () => {
    const props = buildProps({ open: false });
    renderHook(() => useScriptMetadataLifecycle(props));

    expect(props.initializedRef.current).toBe(false);
    expect(props.userEditedRef.current).toBe(false);
    expect(props.contactAutoFilledRef.current).toBe(false);
    expect(props.publicLoadedRef.current).toBe(null);
    expect(props.setLocalScript).toHaveBeenCalledWith(null);
    expect(props.setActiveTab).toHaveBeenCalledWith("basic");
    expect(props.setIsInitializing).toHaveBeenCalledWith(false);
    expect(props.setIsMediaPickerOpen).toHaveBeenCalledWith(false);
    expect(props.setCoverPreviewFailed).toHaveBeenCalledWith(false);
    expect(props.setCoverUploadError).toHaveBeenCalledWith("");
    expect(props.setCoverUploadWarning).toHaveBeenCalledWith("");
  });

  it("loads full script when scriptId is provided", async () => {
    getScript.mockResolvedValue({ id: "s-2", title: "full" });
    const props = buildProps({
      open: true,
      scriptId: "s-2",
      userEditedRef: { current: false },
      contactAutoFilledRef: { current: false },
      publicLoadedRef: { current: null },
    });
    renderHook(() => useScriptMetadataLifecycle(props));

    expect(props.setIsInitializing).toHaveBeenCalledWith(true);
    expect(getScript).toHaveBeenCalledWith("s-2");

    await waitFor(() => {
      expect(props.setLocalScript).toHaveBeenCalledWith({ id: "s-2", title: "full" });
    });
  });

  it("hydrates directly from provided script when scriptId is absent", () => {
    const script = { id: "local-1", title: "draft" };
    const props = buildProps({
      open: true,
      scriptId: "",
      script,
      userEditedRef: { current: false },
      contactAutoFilledRef: { current: false },
      publicLoadedRef: { current: null },
    });
    renderHook(() => useScriptMetadataLifecycle(props));

    expect(props.setIsInitializing).toHaveBeenCalledWith(true);
    expect(props.hydrateScriptState).toHaveBeenCalledWith(script);
    expect(getScript).not.toHaveBeenCalled();
  });
});
