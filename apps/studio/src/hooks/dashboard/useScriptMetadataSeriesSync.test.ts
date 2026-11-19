import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataSeriesSync } from "./useScriptMetadataSeriesSync";

const setter = () => vi.fn();

const buildProps = (overrides = {}) => ({
  seriesId: "",
  seriesName: "",
  seriesOrder: "",
  seriesOptions: [],
  setSeriesName: setter(),
  setSeriesExpanded: setter(),
  ...overrides,
});

describe("useScriptMetadataSeriesSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs series name from selected seriesId", () => {
    const props = buildProps({
      seriesId: "series-2",
      seriesOptions: [
        { id: "series-1", name: "第一季" },
        { id: "series-2", name: "第二季" },
      ],
    });

    renderHook(() => useScriptMetadataSeriesSync(props));

    expect(props.setSeriesName).toHaveBeenCalledWith("第二季");
  });

  it("does not sync name when no seriesId is provided", () => {
    const props = buildProps({
      seriesOptions: [{ id: "series-1", name: "第一季" }],
    });

    renderHook(() => useScriptMetadataSeriesSync(props));

    expect(props.setSeriesName).not.toHaveBeenCalled();
  });

  it("expands series section when id, name, or order has value", () => {
    const withId = buildProps({ seriesId: "s-1" });
    renderHook(() => useScriptMetadataSeriesSync(withId));
    expect(withId.setSeriesExpanded).toHaveBeenCalledWith(true);

    const withName = buildProps({ seriesName: "系列名稱" });
    renderHook(() => useScriptMetadataSeriesSync(withName));
    expect(withName.setSeriesExpanded).toHaveBeenCalledWith(true);

    const withOrder = buildProps({ seriesOrder: "3" });
    renderHook(() => useScriptMetadataSeriesSync(withOrder));
    expect(withOrder.setSeriesExpanded).toHaveBeenCalledWith(true);
  });

  it("does not expand series section when id/name/order are all empty", () => {
    const props = buildProps({
      seriesId: "",
      seriesName: "   ",
      seriesOrder: "  ",
    });

    renderHook(() => useScriptMetadataSeriesSync(props));

    expect(props.setSeriesExpanded).not.toHaveBeenCalled();
  });
});
