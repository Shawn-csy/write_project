import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import ScriptViewer from "./ScriptViewer";
import { parseScreenplay } from "../../lib/screenplayAST";

const scriptRendererSpy = vi.fn(() => <div data-testid="script-renderer-mock" />);

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({ t: (k) => k }),
}));

vi.mock("../../constants/readingFonts", () => ({
  resolveReadingFontStack: () => "serif",
}));

// renderToStaticMarkup used inside ScriptViewer for HTML export
vi.mock("react-dom/server", () => ({
  renderToStaticMarkup: vi.fn(() => "<div>rendered</div>"),
}));

vi.mock("./ScriptRenderer", () => ({
  ScriptRenderer: (props: unknown) => scriptRendererSpy(props),
}));

const sample = `Title: Test Script

INT. ROOM - DAY

A person walks in.

CHARACTER
Hello.
`;

describe("ScriptViewer", () => {
  it("renders without crashing for a plain script text", () => {
    const { container } = render(<ScriptViewer text={sample} />);
    expect(container.querySelector(".script-view-root")).toBeInTheDocument();
  });

  it("skips internal parse when externalAst is provided", () => {
    const { ast, scenes, titleEntries } = parseScreenplay(sample, []);
    const onScenes = vi.fn();
    const onCharacters = vi.fn();

    render(
      <ScriptViewer
        text={sample}
        externalAst={ast}
        externalScenes={scenes}
        externalTitleEntries={titleEntries}
        onScenes={onScenes}
        onCharacters={onCharacters}
      />
    );

    expect(onScenes).toHaveBeenCalledWith(scenes);
    expect(onCharacters).toHaveBeenCalledWith(expect.any(Array));
  });

  it("calls onTitle with title page HTML when title entries exist", () => {
    const onTitle = vi.fn();
    const onHasTitle = vi.fn();
    const onTitleName = vi.fn();

    render(
      <ScriptViewer
        text={sample}
        onTitle={onTitle}
        onHasTitle={onHasTitle}
        onTitleName={onTitleName}
      />
    );

    expect(onHasTitle).toHaveBeenCalledWith(true);
    expect(onTitleName).toHaveBeenCalledWith("Test Script");
  });

  it("renders non-script type as plain text", () => {
    const { container } = render(
      <ScriptViewer text="plain text content" type="text" />
    );
    expect(container.textContent).toContain("plain text content");
  });

  it("calls onCharacters with extracted character names from external AST", () => {
    const onCharacters = vi.fn();
    const { ast, scenes, titleEntries } = parseScreenplay(sample, []);
    render(
      <ScriptViewer
        text={sample}
        externalAst={ast}
        externalScenes={scenes}
        externalTitleEntries={titleEntries}
        onCharacters={onCharacters}
      />
    );
    expect(onCharacters).toHaveBeenCalledWith(expect.any(Array));
  });

  it("calls onSummary with title summary when available", () => {
    const onSummary = vi.fn();
    const textWithSummary = `Title: My Script\nSummary: A short summary.\n\nINT. ROOM - DAY\n\nAction.\n`;
    render(<ScriptViewer text={textWithSummary} onSummary={onSummary} />);
    expect(onSummary).toHaveBeenCalledWith(expect.stringContaining("A short summary"));
  });

  it("keeps marker visibility and only disables marker tooltip when showMarkers is false", () => {
    scriptRendererSpy.mockClear();
    render(
      <ScriptViewer
        text={sample}
        markerConfigs={[{ id: "a" }, { id: "b" }]}
        hiddenMarkerIds={["x"]}
        showMarkers={false}
      />
    );
    const props = scriptRendererSpy.mock.calls.at(-1)?.[0] as { hiddenMarkerIds?: string[]; showMarkerTooltip?: boolean } | undefined;
    expect(props?.hiddenMarkerIds).toEqual(["x"]);
    expect(props?.showMarkerTooltip).toBe(false);
  });
});
