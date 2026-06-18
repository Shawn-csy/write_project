/**
 * Phase 5 fixture scenario tests for ScriptReaderClient.
 *
 * Each test corresponds to a required fixture scenario from
 * docs/archive/public-reader-parity.md Phase 5:
 *
 *   - default script with no custom markers
 *   - custom marker theme
 *   - hidden marker content (marker toggle)  — covered in ScriptReaderClient.test.tsx
 *   - range/layer marker
 *   - TOC entries
 *   - long script (100+ lines)
 *   - script in a series
 *   - script with author/org/tags
 *   - script requiring consent           — covered in ConsentGate.test.tsx
 *   - script with no markers             — covered in ScriptReaderClient.test.tsx
 *
 * These tests verify the full assembly: parse → presentation renderer → ScriptReaderClient.
 * Renderer correctness is covered by RenderBlockRenderer.fixture.test.tsx.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React from "react";
import {
  parseScreenplay,
  normalizeMarkerConfigsSchema,
} from "@write/script-engine";
import type { MarkerConfig, TocEntry } from "@write/script-engine";
import { ScriptReaderClient } from "./ScriptReaderClient";

function makeFetch() {
  return vi.fn().mockImplementation((url: string) => {
    if (String(url).includes("like-status")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ liked: false, likes: 0 }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
}

function renderWith(
  scriptOverride: Record<string, unknown>,
  text: string,
  configs: MarkerConfig[] = [],
  toc: TocEntry[] = [],
) {
  const { ast } = parseScreenplay(text, configs);
  const scriptAst = ast;
  const script = { id: "fixture-id", title: "Fixture Script", ...scriptOverride };
  render(
    <ScriptReaderClient
      scriptId="fixture-id"
      initialScript={script as never}
      scriptAst={scriptAst}
      markerConfigs={configs}
      toc={toc}
    />
  );
  return { scriptAst };
}

describe("Phase 5 fixture scenarios", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = makeFetch() as unknown as typeof global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ── Scenario 1: default script with no custom markers ─────────────────────

  it("default script with no custom markers — renders title and text", async () => {
    await act(async () => {
      renderWith({ title: "Default Script" }, "Act 1\n\nScene one content.", []);
    });
    expect(screen.queryByText("Default Script")).not.toBeNull();
    // no marker trigger shown
    expect(screen.queryByText(/標記 \(/)).toBeNull();
  });

  // ── Scenario 2: custom marker theme ───────────────────────────────────────

  it("custom marker theme — marker content rendered and visibility control shown", async () => {
    const configs = normalizeMarkerConfigsSchema([
      {
        id: "voice",
        label: "Voice",
        start: "[[",
        end: "]]",
        matchMode: "enclosure",
        style: { color: "#9b59b6" },
      },
    ]) as MarkerConfig[];
    await act(async () => {
      renderWith({}, "Line with [[voice text]] here.", configs);
    });
    expect(screen.queryByText("voice text")).not.toBeNull();
    expect(screen.queryByText("標記 (1/1)")).not.toBeNull();
  });

  // ── Scenario 3: range/layer marker ────────────────────────────────────────

  it("range/layer marker — span content rendered across multiple lines", async () => {
    const configs = normalizeMarkerConfigsSchema([
      {
        id: "layer",
        label: "Layer",
        start: "[[",
        end: "]]",
        matchMode: "enclosure",
        style: { background: "#eef" },
      },
    ]) as MarkerConfig[];
    const text = "Before [[start of range\ncontinued range]] after.";
    await act(async () => {
      renderWith({}, text, configs);
    });
    // Marker trigger shows 1 config
    expect(screen.queryByText("標記 (1/1)")).not.toBeNull();
    // Content present in DOM (may be split across spans)
    expect(document.body.textContent).toContain("start of range");
  });

  // ── Scenario 4: TOC entries ───────────────────────────────────────────────

  it("TOC entries — TOC trigger rendered when entries present", async () => {
    const toc: TocEntry[] = [
      { id: "scene-1", label: "Scene 1", level: 1, blockIndex: 0 },
      { id: "scene-2", label: "Scene 2", level: 1, blockIndex: 5 },
    ];
    const text = "## Scene 1\n\nContent.\n\n## Scene 2\n\nMore content.";
    const configs = normalizeMarkerConfigsSchema([]) as MarkerConfig[];
    await act(async () => {
      renderWith({}, text, configs, toc);
    });
    // ReaderToolbar renders TOC trigger when toc entries exist
    expect(screen.queryByText(/目錄/)).not.toBeNull();
  });

  // ── Scenario 5: long script (100+ lines) ─────────────────────────────────

  it("long script — renders without error", async () => {
    const lines = Array.from({ length: 120 }, (_, i) => `Line ${i + 1} content here.`);
    const text = lines.join("\n");
    await act(async () => {
      renderWith({ title: "Long Script" }, text, []);
    });
    expect(screen.queryByText("Long Script")).not.toBeNull();
    expect(document.body.textContent).toContain("Line 1 content here.");
    expect(document.body.textContent).toContain("Line 120 content here.");
  });

  // ── Scenario 6: script in a series ───────────────────────────────────────

  it("script in a series — series back-link rendered in footer", async () => {
    await act(async () => {
      renderWith(
        { title: "Series Script", series: { name: "Epic Series" }, seriesOrder: 2 },
        "Chapter content.",
        [],
      );
    });
    const link = screen.getByRole("link", { name: /查看系列：Epic Series/ });
    expect(link.getAttribute("href")).toBe("/series/Epic%20Series");
  });

  // ── Scenario 7: script with author/org/tags ───────────────────────────────

  it("script with author/org/tags — header shows linked author, org, tags", async () => {
    await act(async () => {
      renderWith(
        {
          title: "Rich Script",
          persona: { id: "p1", displayName: "Alice" },
          organization: { id: "org1", name: "Studio A" },
          tags: [{ id: "t1", name: "Drama" }, { id: "t2", name: "Comedy" }],
        },
        "Content.",
        [],
      );
    });
    // Author link
    const authorLink = screen.getByRole("link", { name: "Alice" });
    expect(authorLink.getAttribute("href")).toBe("/author/p1");
    // Org link
    const orgLink = screen.getByRole("link", { name: "Studio A" });
    expect(orgLink.getAttribute("href")).toBe("/org/org1");
    // Tag links
    expect(screen.getByRole("link", { name: "Drama" }).getAttribute("href")).toBe("/tag/Drama");
    expect(screen.getByRole("link", { name: "Comedy" }).getAttribute("href")).toBe("/tag/Comedy");
  });
});
