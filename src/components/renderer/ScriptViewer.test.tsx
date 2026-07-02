import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
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

describe("ScriptViewer useRenderModelRenderer with filterCharacter", () => {
  it("still uses render-block-renderer when filterCharacter is set (transforms applied in pipeline)", () => {
    const { container } = render(
      <ScriptViewer
        text={sample}
        filterCharacter="CHARACTER"
        useRenderModelRenderer
      />
    );
    expect(container.querySelector(".render-block-renderer")).not.toBeNull();
  });

  it("focusMode prop is ignored by render model path (render-block-renderer still rendered)", () => {
    // focusMode is handled by the legacy ScriptRenderer path only.
    // The render model path does not implement focus dimming — it passes through unchanged.
    const { container } = render(
      <ScriptViewer
        text={sample}
        focusMode
        useRenderModelRenderer
      />
    );
    expect(container.querySelector(".render-block-renderer")).not.toBeNull();
  });
});

describe("ScriptViewer useRenderModelRenderer", () => {
  const markerText = "//BG 夜晚街景";
  const blockConfig = [{ id: "bg", start: "//BG", isBlock: true, label: "背景音開始", style: { color: "green" } }];

  it("renders RenderBlockRenderer article when useRenderModelRenderer=true", () => {
    const { container } = render(
      <ScriptViewer
        text={markerText}
        markerConfigs={blockConfig}
        useRenderModelRenderer
      />
    );
    // visible article uses render-block-renderer class
    expect(container.querySelector(".render-block-renderer")).not.toBeNull();
    // ScriptRenderer may still be called by useRenderedSnapshot for HTML export; that's expected
  });

  it("hides marker when hiddenMarkerIds passed to useRenderModelRenderer branch", () => {
    const { container } = render(
      <ScriptViewer
        text={markerText}
        markerConfigs={blockConfig}
        hiddenMarkerIds={["bg"]}
        useRenderModelRenderer
      />
    );
    expect(container.querySelector(".layer-node")).toBeNull();
  });

  it("applies showLineUnderline class in useRenderModelRenderer branch", () => {
    const { container } = render(
      <ScriptViewer
        text="plain text"
        showLineUnderline
        useRenderModelRenderer
      />
    );
    const article = container.querySelector(".render-block-renderer");
    expect(article?.className).toContain("show-line-underline");
  });

  it("passes showLineUnderline to the v2 renderer branch", () => {
    const { container } = render(
      <ScriptViewer
        text="角色\n台詞第一行。\n\n角色\n台詞第二行。"
        showLineUnderline
        useV2Renderer
      />
    );

    expect(container.querySelector('[data-line-underlines="true"]')).not.toBeNull();
  });

  it("keeps v2 row underlines off when showLineUnderline is false", () => {
    const { container } = render(
      <ScriptViewer
        text="角色\n台詞第一行。\n\n角色\n台詞第二行。"
        showLineUnderline={false}
        useV2Renderer
      />
    );

    expect(container.querySelector('[data-line-underlines="false"]')).not.toBeNull();
    expect(container.querySelector('[data-line-underlines="true"]')).toBeNull();
  });

  it("shows marker tooltip with i18n prefix in useRenderModelRenderer branch", () => {
    render(
      <ScriptViewer
        text={markerText}
        markerConfigs={blockConfig}
        showMarkers
        useRenderModelRenderer
      />
    );
    const label = screen.getByText(/夜晚街景/);
    fireEvent.pointerMove(label, { clientX: 100, clientY: 80 });
    // t() mock returns the key; prefix key is "scriptRenderer.markerTooltipPrefix"
    expect(screen.getByText(/scriptRenderer\.markerTooltipPrefix.*背景音開始/)).toBeDefined();
  });

  it("suppresses tooltip when showMarkers=false in useRenderModelRenderer branch", () => {
    render(
      <ScriptViewer
        text={markerText}
        markerConfigs={blockConfig}
        showMarkers={false}
        useRenderModelRenderer
      />
    );
    const label = screen.getByText(/夜晚街景/);
    fireEvent.pointerMove(label, { clientX: 100, clientY: 80 });
    expect(screen.queryByText(/背景音開始/)).toBeNull();
  });
});
