/**
 * Shared lazy-loader for Anime.js.
 *
 * Module-level promise cache — one import() across the entire app.
 * All motion hooks import getAnimate() from here so the first press/trigger
 * on ANY hook pre-warms the module for every other hook.
 */
let cache: Promise<typeof import("animejs")> | null = null;

export function getAnimate() {
  if (!cache) cache = import("animejs");
  return cache;
}
