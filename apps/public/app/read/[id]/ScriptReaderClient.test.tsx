/**
 * Integration tests for ScriptReaderClient — Next public reader assembly layer.
 *
 * Tests the real component, verifying that:
 *   1. ScriptReaderClient renders shared ReaderToolbar + MarkerVisibilityMenu
 *   2. marker toggle (via shared hook) correctly affects ScriptContentRenderer output
 *   3. ReadWorkHeader renders script metadata
 *
 * Marker hook state logic is covered by:
 *   packages/script-reader-ui/src/__fixtures__/useReaderMarkerVisibility.test.ts
 *
 * Renderer block output is covered by:
 *   packages/script-reader-renderer/src/__fixtures__/RenderBlockRenderer.fixture.test.tsx
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { parseScreenplay, toRenderBlocks, normalizeMarkerConfigsSchema } from "@write/script-engine";
import type { MarkerConfig } from "@write/script-engine";
import { ScriptReaderClient } from "./ScriptReaderClient";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockExportScriptAsPdf = vi.fn().mockResolvedValue(undefined);
// Returning a real Element lets usePublicExport set pdfReady=true immediately.
const mockPickRenderedRoot = vi.fn(() => document.createElement("div"));

vi.mock("@write/reader-export", () => ({
  exportScriptAsPdf: (...args: unknown[]) => mockExportScriptAsPdf(...args),
  pickRenderedRoot: () => mockPickRenderedRoot(),
  buildPrintHtml: vi.fn(),
  getRenderedSnapshot: vi.fn(),
  getRenderedLines: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MINIMAL_SCRIPT = {
  id: "test-script-id",
  title: "Test Script Title",
  synopsis: "A short synopsis.",
  views: 10,
  likes: 2,
};

const MARKER_CONFIGS_RAW = [
  {
    id: "alpha",
    label: "Alpha Marker",
    start: "[[",
    end: "]]",
    matchMode: "enclosure" as const,
    style: { color: "red" },
  },
  {
    id: "beta",
    label: "Beta Marker",
    start: "{{",
    end: "}}",
    matchMode: "enclosure" as const,
    style: { color: "blue" },
  },
];

const SCRIPT_TEXT = "Line with [[alpha content]] and {{beta content}}.";

function buildProps() {
  const markerConfigs = normalizeMarkerConfigsSchema(MARKER_CONFIGS_RAW) as MarkerConfig[];
  const { ast } = parseScreenplay(SCRIPT_TEXT, markerConfigs);
  const renderBlocks = toRenderBlocks(ast, markerConfigs);
  return { markerConfigs, renderBlocks };
}

function makeFetchMock() {
  return vi.fn().mockImplementation((url: string) => {
    if (String(url).includes("like-status")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ liked: false, likes: 2 }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

describe("ScriptReaderClient — Next host assembly", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = makeFetchMock() as unknown as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders script title and synopsis from ReadWorkHeader", async () => {
    const { markerConfigs, renderBlocks } = buildProps();
    await act(async () => {
      render(
        <ScriptReaderClient
          scriptId="test-script-id"
          initialScript={MINIMAL_SCRIPT}
          renderBlocks={renderBlocks}
          markerConfigs={markerConfigs}
          toc={[]}
        />
      );
    });
    expect(screen.queryByText("Test Script Title")).not.toBeNull();
    expect(screen.queryByText("A short synopsis.")).not.toBeNull();
  });

  it("renders marker trigger from shared ReaderToolbar (MarkerVisibilityMenu)", async () => {
    const { markerConfigs, renderBlocks } = buildProps();
    await act(async () => {
      render(
        <ScriptReaderClient
          scriptId="test-script-id"
          initialScript={MINIMAL_SCRIPT}
          renderBlocks={renderBlocks}
          markerConfigs={markerConfigs}
          toc={[]}
        />
      );
    });
    expect(screen.queryByText("標記 (2/2)")).not.toBeNull();
  });

  it("renders all marker content visible initially", async () => {
    const { markerConfigs, renderBlocks } = buildProps();
    await act(async () => {
      render(
        <ScriptReaderClient
          scriptId="test-script-id"
          initialScript={MINIMAL_SCRIPT}
          renderBlocks={renderBlocks}
          markerConfigs={markerConfigs}
          toc={[]}
        />
      );
    });
    expect(screen.queryByText("alpha content")).not.toBeNull();
    expect(screen.queryByText("beta content")).not.toBeNull();
  });

  it("marker toggle via shared toolbar hides content in renderer", async () => {
    const user = userEvent.setup();
    const { markerConfigs, renderBlocks } = buildProps();
    await act(async () => {
      render(
        <ScriptReaderClient
          scriptId="test-script-id"
          initialScript={MINIMAL_SCRIPT}
          renderBlocks={renderBlocks}
          markerConfigs={markerConfigs}
          toc={[]}
        />
      );
    });
    // Open the shared MarkerVisibilityMenu
    await act(async () => {
      await user.click(screen.getByText("標記 (2/2)"));
    });
    await waitFor(() => expect(screen.queryByText("Alpha Marker")).not.toBeNull());
    // Toggle alpha off
    await act(async () => {
      await user.click(screen.getByText("Alpha Marker"));
    });
    await waitFor(() => {
      expect(screen.queryByText("alpha content")).toBeNull();
      expect(screen.queryByText("beta content")).not.toBeNull();
      expect(screen.queryByText("標記 (1/2)")).not.toBeNull();
    });
  });

  it("does not expose route-local text download even when content is present", async () => {
    const { markerConfigs, renderBlocks } = buildProps();
    await act(async () => {
      render(
        <ScriptReaderClient
          scriptId="test-script-id"
          initialScript={{ ...MINIMAL_SCRIPT, content: SCRIPT_TEXT }}
          renderBlocks={renderBlocks}
          markerConfigs={markerConfigs}
          toc={[]}
        />
      );
    });
    expect(screen.queryByRole("button", { name: /下載 .txt/i })).toBeNull();
  });

  it("no marker trigger when markerConfigs is empty", async () => {
    const emptyConfigs = normalizeMarkerConfigsSchema([]) as MarkerConfig[];
    const { ast } = parseScreenplay("Plain text.", emptyConfigs);
    const renderBlocks = toRenderBlocks(ast, emptyConfigs);
    await act(async () => {
      render(
        <ScriptReaderClient
          scriptId="test-script-id"
          initialScript={MINIMAL_SCRIPT}
          renderBlocks={renderBlocks}
          markerConfigs={emptyConfigs}
          toc={[]}
        />
      );
    });
    expect(screen.queryByText(/標記 \(/)).toBeNull();
  });
});

describe("ScriptReaderClient — toolbar PDF + share contract", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = makeFetchMock() as unknown as typeof global.fetch;
    mockExportScriptAsPdf.mockClear();
    mockPickRenderedRoot.mockClear();
    mockPickRenderedRoot.mockReturnValue(document.createElement("div"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function renderClient() {
    const { markerConfigs, renderBlocks } = buildProps();
    return render(
      <ScriptReaderClient
        scriptId="test-script-id"
        initialScript={MINIMAL_SCRIPT}
        renderBlocks={renderBlocks}
        markerConfigs={markerConfigs}
        toc={[]}
      />
    );
  }

  it("toolbar renders 分享 button", async () => {
    await act(async () => { renderClient(); });
    expect(screen.queryByRole("button", { name: /分享/ })).not.toBeNull();
  });

  it("toolbar renders PDF button", async () => {
    await act(async () => { renderClient(); });
    expect(screen.queryByRole("button", { name: /PDF/ })).not.toBeNull();
  });

  it("PDF button enabled once pickRenderedRoot returns a node", async () => {
    await act(async () => { renderClient(); });
    // rAF fires synchronously in jsdom, so pdfReady should be true after act
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: /PDF/ });
      expect((btn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  it("PDF button disabled when pickRenderedRoot returns null", async () => {
    mockPickRenderedRoot.mockReturnValue(null);
    await act(async () => { renderClient(); });
    const btn = screen.getByRole("button", { name: /PDF/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("clicking PDF button calls exportScriptAsPdf", async () => {
    const user = userEvent.setup();
    await act(async () => { renderClient(); });
    await waitFor(() => {
      expect((screen.getByRole("button", { name: /PDF/ }) as HTMLButtonElement).disabled).toBe(false);
    });
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /PDF/ }));
    });
    expect(mockExportScriptAsPdf).toHaveBeenCalledTimes(1);
    expect(mockExportScriptAsPdf).toHaveBeenCalledWith(
      MINIMAL_SCRIPT.title,
      expect.objectContaining({ renderedHtml: expect.any(String), headerHtml: expect.any(String) })
    );
  });

  // Share clipboard/prompt paths covered by usePublicReaderShare.test.ts.
});
