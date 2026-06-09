import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
