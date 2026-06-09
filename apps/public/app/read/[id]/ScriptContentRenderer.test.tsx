/**
 * Parity tests for ScriptContentRenderer (Next.js public reader).
 * Mirrors RenderBlockRenderer behaviour: same hiddenMarkerIds, markerConfigs,
 * layer-node/range-node class names, data-marker-id attributes.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { parseScreenplay, toRenderBlocks, normalizeMarkerConfigsSchema } from "@write/script-engine";
import { ScriptContentRenderer } from "./ScriptContentRenderer";

const renderWithBlocks = (
  text: string,
  configs: Parameters<typeof normalizeMarkerConfigsSchema>[0] = [],
  hiddenMarkerIds: string[] = []
) => {
  const normalized = normalizeMarkerConfigsSchema(configs);
  const { ast } = parseScreenplay(text, normalized);
  const blocks = toRenderBlocks(ast, normalized);
  return render(
    <ScriptContentRenderer
      blocks={blocks}
      markerConfigs={normalized}
      hiddenMarkerIds={hiddenMarkerIds}
    />
  );
};

const charConfig = [
  { id: "char", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
  { id: "diag", start: "#D ", matchMode: "prefix", parseAs: "dialogue", mapFields: { text: "$text" } },
] as const;

describe("ScriptContentRenderer parity", () => {
  it("renders all characters when no filter (__ALL__ passthrough from pipeline)", () => {
    renderWithBlocks("角色 Amy\n#D 台詞\n角色 Bob\n#D 回應", charConfig);
    expect(screen.getByText("Amy")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("hidden inline marker does not render", () => {
    renderWithBlocks(
      "Hello [[SECRET]] text",
      [{ id: "secret", start: "[[", end: "]]", matchMode: "enclosure" }],
      ["secret"]
    );
    expect(screen.queryByText("SECRET")).toBeNull();
    expect(screen.queryByText(/Hello/)).not.toBeNull();
  });

  it("hidden layer (block) marker does not render layer-node", () => {
    const { container } = renderWithBlocks(
      "//BG 背景音",
      [{ id: "bg", start: "//BG", isBlock: true }],
      ["bg"]
    );
    expect(container.querySelector(".layer-node")).toBeNull();
  });

  it("visible layer marker renders layer-node with data-marker-id", () => {
    const { container } = renderWithBlocks(
      "//BG 背景音",
      [{ id: "bg", start: "//BG", isBlock: true, label: "背景" }]
    );
    const layer = container.querySelector(".layer-node");
    expect(layer).not.toBeNull();
    expect(layer!.getAttribute("data-marker-id")).toBe("bg");
  });

  it("hidden range marker: layer-node absent, range-content preserved", () => {
    const { container } = renderWithBlocks(
      ">>R Start\nRange Content\n<<R End",
      [{ id: "r", start: ">>R", end: "<<R", matchMode: "range" }],
      ["r"]
    );
    expect(container.querySelector(".range-node")).not.toBeNull();
    expect(container.querySelector(".layer-node")).toBeNull();
    expect(screen.getByText("Range Content")).toBeDefined();
  });

  it("marker style applied to inline run", () => {
    renderWithBlocks("Styled [[word]] here", [
      { id: "h", start: "[[", end: "]]", matchMode: "enclosure", style: { color: "red" } },
    ]);
    const span = screen.getByText("word");
    expect(span.style.color).toBe("red");
  });

  it("tooltip shows marker label on pointer move when showMarkerTooltip=true", () => {
    const normalized = normalizeMarkerConfigsSchema([
      { id: "bg", start: "//BG", isBlock: true, label: "背景音開始" },
    ]);
    const { ast } = parseScreenplay("//BG 夜晚街景", normalized);
    const blocks = toRenderBlocks(ast, normalized);
    render(
      <ScriptContentRenderer
        blocks={blocks}
        markerConfigs={normalized}
        showMarkerTooltip
      />
    );
    const label = screen.getByText(/夜晚街景/);
    fireEvent.pointerMove(label, { clientX: 100, clientY: 80 });
    expect(screen.getByText("標記: 背景音開始")).toBeDefined();
  });

  it("tooltip suppressed when showMarkerTooltip=false (default)", () => {
    const normalized = normalizeMarkerConfigsSchema([
      { id: "bg", start: "//BG", isBlock: true, label: "背景音開始" },
    ]);
    const { ast } = parseScreenplay("//BG 夜晚街景", normalized);
    const blocks = toRenderBlocks(ast, normalized);
    render(
      <ScriptContentRenderer
        blocks={blocks}
        markerConfigs={normalized}
        showMarkerTooltip={false}
      />
    );
    const label = screen.getByText(/夜晚街景/);
    fireEvent.pointerMove(label, { clientX: 100, clientY: 80 });
    expect(screen.queryByText(/背景音開始/)).toBeNull();
  });

  it("character color is assigned (CSS var, not hardcoded hex)", () => {
    renderWithBlocks("角色 Amy", [
      { id: "char", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
    ]);
    const el = screen.getByText("Amy");
    expect(el.style.color).toBe("var(--marker-color-russet)");
  });

  it("color cache is instance-scoped: re-render resets sequence", () => {
    const cfg = [
      { id: "char", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
    ];
    const normalized = normalizeMarkerConfigsSchema(cfg);
    const { ast } = parseScreenplay("角色 Amy", normalized);
    const blocks = toRenderBlocks(ast, normalized);

    // First render
    const { unmount } = render(<ScriptContentRenderer blocks={blocks} markerConfigs={normalized} />);
    expect(screen.getByText("Amy").style.color).toBe("var(--marker-color-russet)");
    unmount();

    // Second render with fresh blocks — should still get first color (new cache)
    const { ast: ast2 } = parseScreenplay("角色 Bob", normalized);
    const blocks2 = toRenderBlocks(ast2, normalized);
    render(<ScriptContentRenderer blocks={blocks2} markerConfigs={normalized} />);
    expect(screen.getByText("Bob").style.color).toBe("var(--marker-color-russet)");
  });
});
