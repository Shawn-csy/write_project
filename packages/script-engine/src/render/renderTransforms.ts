/**
 * Pure transform functions over RenderBlock[].
 *
 * No React, no DOM. Consumers (ScriptViewer, export, Next reader) compose
 * these before passing blocks to a renderer.
 */

import type {
  RenderBlock,
  CharacterBlock,
  RangeBlock,
} from "./renderTypes";

// ─── helpers ──────────────────────────────────────────────────────────────────

const normalizeKey = (s: string) => s.trim().toLowerCase();

// ─── filterRenderBlocksByCharacter ────────────────────────────────────────────

/**
 * Keep only blocks belonging to the specified character's speech group.
 *
 * A "speech group" is: the character block itself, followed by contiguous
 * dialogue/parenthetical blocks that immediately follow it (before the next
 * character or scene_heading block).
 *
 * Non-speech blocks (action, scene_heading, blank, layer, range) are retained
 * as-is so the surrounding context is preserved.
 *
 * Pass `null` or `""` to return blocks unchanged.
 */
export function filterRenderBlocksByCharacter(
  blocks: RenderBlock[],
  characterName: string | null | undefined
): RenderBlock[] {
  if (!characterName) return blocks;
  const targetKey = normalizeKey(characterName);

  const out: RenderBlock[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];

    // Recurse into range children
    if (block.kind === "range") {
      const rb = block as RangeBlock;
      const filteredChildren = filterRenderBlocksByCharacter(rb.children, characterName);
      out.push({ ...rb, children: filteredChildren });
      i++;
      continue;
    }

    if (block.kind === "character") {
      const cb = block as CharacterBlock;
      const blockKey = normalizeKey(cb.text || "");
      const isMatch = blockKey === targetKey;

      // Collect the speech group (character + following dialogue/parenthetical)
      const group: RenderBlock[] = [block];
      let j = i + 1;
      while (j < blocks.length) {
        const next = blocks[j];
        if (next.kind === "dialogue" || next.kind === "parenthetical") {
          group.push(next);
          j++;
        } else {
          break;
        }
      }

      if (isMatch) {
        out.push(...group);
      }
      // Skip the whole group regardless
      i = j;
      continue;
    }

    // Retain non-speech blocks
    out.push(block);
    i++;
  }

  return out;
}

