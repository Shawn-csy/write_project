/**
 * viewerRenderPipeline
 *
 * Single composition layer for the render model path.
 * Converts ast + viewer options → RenderBlock[].
 *
 * Rules:
 * - All sentinel normalization (__ALL__ → null) happens here, not in UI.
 * - No React imports. Pure logic only.
 */

import {
  toRenderBlocks,
  normalizeMarkerConfigsSchema,
  filterRenderBlocksByCharacter,
} from "@write/script-engine";
import type { RenderBlock, MarkerConfig } from "@write/script-engine";

// ─── types ────────────────────────────────────────────────────────────────────

export interface ViewerOptions {
  filterCharacter?: string | null;
}

// ─── sentinel normalisation ───────────────────────────────────────────────────

/** "__ALL__" is a UI sentinel meaning "show all characters". Normalise to null. */
function normalizeCharacterFilter(value: string | null | undefined): string | null {
  if (!value || value === "__ALL__") return null;
  return value;
}

// ─── core pure function ───────────────────────────────────────────────────────

/**
 * Build viewer render blocks from ast + options.
 *
 * @param ast            Engine AstNode (type="root").
 * @param markerConfigs  Raw marker config array (will be normalised internally).
 * @param options        Viewer options: filterCharacter.
 * @returns              RenderBlock[].
 */
export function buildViewerRenderBlocks(
  ast: Parameters<typeof toRenderBlocks>[0],
  markerConfigs: MarkerConfig[] | readonly unknown[],
  options: ViewerOptions = {}
): RenderBlock[] {
  const normalizedConfigs = normalizeMarkerConfigsSchema(
    Array.isArray(markerConfigs) ? markerConfigs : []
  );

  const base = toRenderBlocks(ast, normalizedConfigs);

  const character = normalizeCharacterFilter(options.filterCharacter);
  if (character) {
    return filterRenderBlocksByCharacter(base, character);
  }
  return base;
}

/**
 * Derive raw (unfiltered) blocks from ast for HTML snapshot.
 * Used by useRenderedSnapshot to get unfiltered HTML alongside filtered view.
 */
export function buildRawRenderBlocks(
  ast: Parameters<typeof toRenderBlocks>[0],
  markerConfigs: MarkerConfig[] | readonly unknown[]
): RenderBlock[] {
  const normalizedConfigs = normalizeMarkerConfigsSchema(
    Array.isArray(markerConfigs) ? markerConfigs : []
  );
  return toRenderBlocks(ast, normalizedConfigs);
}
