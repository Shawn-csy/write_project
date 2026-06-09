/**
 * Fixture tests for RenderBlockRenderer (shared renderer package).
 * These are the canonical renderer parity tests — Next and Vite both use
 * the same renderer, so this is the single source of truth.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { parseScreenplay, toRenderBlocks, normalizeMarkerConfigsSchema } from "@write/script-engine";
import { RenderBlockRenderer } from "../RenderBlockRenderer";

const renderWithBlocks = (
  text: string,
  configs: Parameters<typeof normalizeMarkerConfigsSchema>[0] = [],
  hiddenMarkerIds: string[] = []
) => {
  const normalized = normalizeMarkerConfigsSchema(configs);
  const { ast } = parseScreenplay(text, normalized);
  const blocks = toRenderBlocks(ast, normalized);
  return render(
    <RenderBlockRenderer
      blocks={blocks}
      markerConfigs={normalized}
      hiddenMarkerIds={hiddenMarkerIds}
      colorCache={{ current: new Map() }}
    />
  );
};

describe("RenderBlockRenderer (shared package)", () => {
  it("renders inline renderer templates from render model", () => {
    renderWithBlocks("Hello [[WORLD]]", [
      {
        id: "highlight",
        start: "[[",
        end: "]]",
        matchMode: "enclosure",
        renderer: { template: "Ticket: {{content}}" },
        style: { color: "red", fontWeight: "bold" },
      },
    ]);
    const span = screen.getByText("Ticket: WORLD");
    expect(span).toBeDefined();
    expect(span.style.color).toBe("red");
    expect(span.style.fontWeight).toBe("bold");
  });

  it("respects showDelimiters for inline markers", () => {
    renderWithBlocks("Hello [[WORLD]]", [
      { id: "h", start: "[[", end: "]]", matchMode: "enclosure", showDelimiters: true },
    ]);
    expect(screen.queryByText("[[WORLD]]")).not.toBeNull();
  });

  it("hidden inline marker does not render", () => {
    renderWithBlocks(
      "Hidden [[SECRET]] text",
      [{ id: "secret", start: "[[", end: "]]", matchMode: "enclosure" }],
      ["secret"]
    );
    expect(screen.queryByText("SECRET")).toBeNull();
    expect(screen.queryByText(/Hidden/)).not.toBeNull();
  });

  it("renders scene headings with id and marker attributes", () => {
    const { container } = renderWithBlocks("INT. Opening", [
      { id: "scene", start: "INT.", matchMode: "prefix", parseAs: "scene_heading", mapFields: { text: "$text" } },
    ]);
    const heading = screen.getByRole("heading", { name: /Opening/ });
    expect(heading.id).toBeTruthy();
    expect(heading.getAttribute("data-marker-id")).toBe("scene");
    expect(container.querySelector(".script-scene-heading")).not.toBeNull();
  });

  it("assigns stable character color (CSS var)", () => {
    renderWithBlocks("角色 Amy", [
      { id: "character", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
    ]);
    const character = screen.getByText("Amy");
    expect(character.tagName.toLowerCase()).toBe("strong");
    expect(character.style.color).toBe("var(--marker-color-russet)");
  });

  it("assigns second character a different color from sequence", () => {
    renderWithBlocks("角色 Amy\n角色 Bob", [
      { id: "character", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
    ]);
    expect(screen.getByText("Amy").style.color).toBe("var(--marker-color-russet)");
    expect(screen.getByText("Bob").style.color).toBe("var(--marker-color-slate-blue)");
  });

  it("renders range with layer boundary and content", () => {
    const { container } = renderWithBlocks(">>R Start\nRange Content\n<<R End", [
      { id: "rangeKey", start: ">>R", end: "<<R", matchMode: "range", style: { color: "blue" } },
    ]);
    expect(container.querySelector(".range-node")).not.toBeNull();
    expect(container.querySelector(".layer-node")).not.toBeNull();
    expect(screen.getByText("Range Content")).toBeDefined();
  });

  it("hidden range marker: layer-node absent, range-content preserved", () => {
    const { container } = renderWithBlocks(">>R Start\nRange Content\n<<R End", [
      { id: "rangeKey", start: ">>R", end: "<<R", matchMode: "range", style: { color: "blue" } },
    ], ["rangeKey"]);
    expect(container.querySelector(".range-node")).not.toBeNull();
    expect(container.querySelector(".layer-node")).toBeNull();
    expect(screen.getByText("Range Content")).toBeDefined();
  });

  it("applies style to layer node (block marker)", () => {
    const { container } = renderWithBlocks("/d\nBOB\n/d", [
      { id: "dual-block", start: "/d", end: "/d", isBlock: true, style: { backgroundColor: "rgb(211, 211, 211)" } },
    ]);
    const layer = container.querySelector(".layer-node");
    expect(layer).not.toBeNull();
    expect((layer as HTMLElement).style.backgroundColor).toBe("rgb(211, 211, 211)");
  });

  it("hidden layer (block marker) does not render layer-node", () => {
    const { container } = renderWithBlocks("/b BLOCK CONTENT /b", [
      { id: "blockKey", start: "/b", end: "/b", isBlock: true, matchMode: "enclosure" },
    ], ["blockKey"]);
    expect(container.querySelector(".layer-node")).toBeNull();
  });

  it("hides multiple marker ids simultaneously", () => {
    const { container } = renderWithBlocks("Visible\n/b BLOCK /b\n[[Inline]]", [
      { id: "b", start: "/b", end: "/b", isBlock: true, matchMode: "enclosure" },
      { id: "i", start: "[[", end: "]]", matchMode: "enclosure" },
    ], ["b", "i"]);
    expect(container.querySelector(".layer-node")).toBeNull();
    expect(screen.queryByText("Inline")).toBeNull();
    expect(screen.queryByText(/Visible/)).not.toBeNull();
  });

  it("shows tooltip with marker label on pointer move", () => {
    renderWithBlocks("//BG 夜晚街景", [
      { id: "bg", start: "//BG", isBlock: true, label: "背景音開始", style: { color: "green" } },
    ]);
    const label = screen.getByText(/夜晚街景/);
    fireEvent.pointerMove(label, { clientX: 100, clientY: 80 });
    expect(screen.getByText("標記: 背景音開始")).toBeDefined();
  });

  it("suppresses tooltip when showMarkerTooltip=false", () => {
    const normalized = normalizeMarkerConfigsSchema([
      { id: "bg", start: "//BG", isBlock: true, label: "背景音開始", style: { color: "green" } },
    ]);
    const { ast } = parseScreenplay("//BG 夜晚街景", normalized);
    const blocks = toRenderBlocks(ast, normalized);
    render(
      <RenderBlockRenderer
        blocks={blocks}
        markerConfigs={normalized}
        showMarkerTooltip={false}
        colorCache={{ current: new Map() }}
      />
    );
    const label = screen.getByText(/夜晚街景/);
    fireEvent.pointerMove(label, { clientX: 100, clientY: 80 });
    expect(screen.queryByText("標記: 背景音開始")).toBeNull();
  });

  it("renders all characters when no filter (__ALL__ handled by pipeline before renderer)", () => {
    renderWithBlocks("角色 Amy\n角色 Bob", [
      { id: "char", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
    ]);
    expect(screen.getByText("Amy")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("forwards fontSize, lineHeight, readingFontFamily, className to article", () => {
    const normalized = normalizeMarkerConfigsSchema([]);
    const { ast } = parseScreenplay("text", normalized);
    const blocks = toRenderBlocks(ast, normalized);
    const { container } = render(
      <RenderBlockRenderer
        blocks={blocks}
        fontSize={18}
        lineHeight={2}
        readingFontFamily="monospace"
        className="my-custom-class"
        colorCache={{ current: new Map() }}
      />
    );
    const article = container.querySelector("article");
    expect(article).not.toBeNull();
    expect(article!.style.fontSize).toBe("18px");
    expect(article!.style.lineHeight).toBe("2");
    expect(article!.style.fontFamily).toBe("monospace");
    expect(article!.className).toContain("my-custom-class");
  });

  it("visible layer marker renders layer-node with data-marker-id", () => {
    const { container } = renderWithBlocks("//BG 背景音", [
      { id: "bg", start: "//BG", isBlock: true, label: "背景" },
    ]);
    const layer = container.querySelector(".layer-node");
    expect(layer).not.toBeNull();
    expect(layer!.getAttribute("data-marker-id")).toBe("bg");
  });

  it("marker style applied to inline run", () => {
    renderWithBlocks("Styled [[word]] here", [
      { id: "h", start: "[[", end: "]]", matchMode: "enclosure", style: { color: "red" } },
    ]);
    expect(screen.getByText("word").style.color).toBe("red");
  });
});
