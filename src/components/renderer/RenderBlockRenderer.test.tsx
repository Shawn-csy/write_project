import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { parseScreenplay } from "../../lib/screenplayAST";
import { toRenderBlocks } from "@write/script-engine";
import { RenderBlockRenderer } from "./RenderBlockRenderer";

const renderWithBlocks = (text: string, configs: any[] = [], hiddenMarkerIds: string[] = []) => {
  const { ast } = parseScreenplay(text, configs);
  const blocks = toRenderBlocks(ast, configs);
  return render(
    <RenderBlockRenderer
      blocks={blocks}
      markerConfigs={configs}
      hiddenMarkerIds={hiddenMarkerIds}
      colorCache={{ current: new Map() }}
    />
  );
};

describe("RenderBlockRenderer", () => {
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

  it("hides inline marker runs by marker id", () => {
    renderWithBlocks("Hidden [[SECRET]] text", [
      { id: "secret", start: "[[", end: "]]", matchMode: "enclosure" },
    ], ["secret"]);

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

  it("assigns stable character color", () => {
    renderWithBlocks("角色 Amy", [
      { id: "character", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
    ]);

    const character = screen.getByText("Amy");
    expect(character.tagName.toLowerCase()).toBe("strong");
    expect(character.style.color).toBe("var(--marker-color-russet)");
  });

  it("renders range with layer boundary and content", () => {
    const { container } = renderWithBlocks(">>R Start\nRange Content\n<<R End", [
      { id: "rangeKey", start: ">>R", end: "<<R", matchMode: "range", style: { color: "blue" } },
    ]);

    expect(container.querySelector(".range-node")).not.toBeNull();
    expect(container.querySelector(".layer-node")).not.toBeNull();
    expect(screen.getByText("Range Content")).toBeDefined();
  });

  it("hides range boundary lines when marker id is hidden but keeps content", () => {
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

  it("hides layer node (single-line block) when marker id is hidden", () => {
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

  it("assigns second character a different color from sequence", () => {
    renderWithBlocks("角色 Amy\n角色 Bob", [
      { id: "character", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
    ]);

    const amy = screen.getByText("Amy");
    const bob = screen.getByText("Bob");
    expect(amy.style.color).toBe("var(--marker-color-russet)");
    expect(bob.style.color).toBe("var(--marker-color-slate-blue)");
  });

  it("shows tooltip with marker label on pointer move", () => {
    // block marker → layer node → data-marker-id on DOM → tooltip resolves
    renderWithBlocks("//BG 夜晚街景", [
      { id: "bg", start: "//BG", isBlock: true, label: "背景音開始", style: { color: "green" } },
    ]);

    const label = screen.getByText(/夜晚街景/);
    fireEvent.pointerMove(label, { clientX: 100, clientY: 80 });
    expect(screen.getByText("標記: 背景音開始")).toBeDefined();
  });

  it("suppresses tooltip when showMarkerTooltip=false", () => {
    const configs = [{ id: "bg", start: "//BG", isBlock: true, label: "背景音開始", style: { color: "green" } }];
    const { ast } = parseScreenplay("//BG 夜晚街景", configs);
    const blocks = toRenderBlocks(ast, configs);
    render(
      <RenderBlockRenderer
        blocks={blocks}
        markerConfigs={configs}
        showMarkerTooltip={false}
        colorCache={{ current: new Map() }}
      />
    );

    const label = screen.getByText(/夜晚街景/);
    fireEvent.pointerMove(label, { clientX: 100, clientY: 80 });
    expect(screen.queryByText("標記: 背景音開始")).toBeNull();
  });

  it("renders all character dialogue when no filterCharacter (__ALL__ passthrough)", () => {
    // __ALL__ sentinel is normalized to null by viewerRenderPipeline before reaching renderer.
    // RenderBlockRenderer receives all blocks and renders all characters.
    renderWithBlocks("角色 Amy\n台詞 A\n角色 Bob\n台詞 B", [
      { id: "char", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
    ]);

    expect(screen.getByText("Amy")).toBeDefined();
    expect(screen.getByText("Bob")).toBeDefined();
  });

  it("hidden range marker: keeps range content, removes start/end layer nodes", () => {
    const { container } = renderWithBlocks(">>R Start\nRange Content\n<<R End", [
      { id: "r", start: ">>R", end: "<<R", matchMode: "range" },
    ], ["r"]);

    expect(container.querySelector(".range-node")).not.toBeNull();
    expect(container.querySelector(".layer-node")).toBeNull();
    expect(screen.getByText("Range Content")).toBeDefined();
  });

  it("forwards fontSize, lineHeight, readingFontFamily, className to article", () => {
    const { ast } = parseScreenplay("text", []);
    const blocks = toRenderBlocks(ast, []);
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
});
