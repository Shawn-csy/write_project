import React from "react";
import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { V2LayoutPreviewEditor } from "./V2LayoutPreviewEditor";
import { normalizeLayoutConfig } from "../../../lib/v2";

vi.mock("../../renderer/v2/EventTextV2", () => ({
  EventTextV2: ({ text }: { text: string }) => <span>{text}</span>,
}));
// Radix slider needs ResizeObserver, which jsdom lacks.
vi.mock("../../ui/slider", () => ({
  Slider: ({ value, onValueChange, ...rest }: { value: number[]; onValueChange: (v: number[]) => void }) => (
    <input type="range" value={value[0]} onChange={(e) => onValueChange([Number(e.target.value)])} aria-label={(rest as { "aria-label"?: string })["aria-label"]} />
  ),
}));

const t = (key: string) => key;

function setup() {
  const base = normalizeLayoutConfig({});
  const onChange = vi.fn();
  render(<V2LayoutPreviewEditor layoutConfig={base} onChange={onChange} markerConfigs={[]} t={t} />);
  return { base, onChange };
}

describe("V2LayoutPreviewEditor", () => {
  it("lists every column as a row with name, visibility and ordering controls (no controls squeezed into preview headers)", () => {
    const { base } = setup();
    const list = screen.getByRole("region", { name: "欄位" });
    base.tracks.forEach((track) => {
      expect(list.querySelector(`input[aria-label="${track.id} name"]`)).not.toBeNull();
      expect(screen.getByRole("switch", { name: `${track.name} enabled` })).toBeInTheDocument();
    });
    const preview = screen.getByRole("region", { name: "預覽" });
    expect(preview.querySelector("input")).toBeNull();
    expect(preview.querySelector("button")).toBeNull();
  });

  it("emits a layout change when a column is toggled off", () => {
    const { base, onChange } = setup();
    const first = base.tracks[0];
    fireEvent.click(screen.getByRole("switch", { name: `${first.name} enabled` }));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0];
    expect(next.tracks.find((tr: { id: string }) => tr.id === first.id).enabled).toBe(false);
  });

  it("swaps order with the move buttons", () => {
    const { base, onChange } = setup();
    const sorted = [...base.tracks].sort((a, b) => a.order - b.order);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`${sorted[0].name} .*下移`) }));
    const next = onChange.mock.calls[0][0];
    const a = next.tracks.find((tr: { id: string }) => tr.id === sorted[0].id);
    const b = next.tracks.find((tr: { id: string }) => tr.id === sorted[1].id);
    expect(a.order).toBeGreaterThan(b.order);
  });
});
