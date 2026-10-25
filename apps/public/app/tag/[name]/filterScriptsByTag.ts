interface TagLike { name?: string }
interface ScriptLike { tags?: Array<TagLike | string> }
interface ExternalScriptLike { categories?: string[] }

/**
 * Returns true when script has a tag matching tagName (case-insensitive exact match).
 */
export function scriptHasTag(script: ScriptLike, tagName: string): boolean {
  const normalized = tagName.toLowerCase();
  return (script.tags ?? []).some((t) => {
    const name = typeof t === "string" ? t : (t.name ?? "");
    return name.toLowerCase() === normalized;
  });
}

export function filterScriptsByTag<T extends ScriptLike>(scripts: T[], tagName: string): T[] {
  return scripts.filter((s) => scriptHasTag(s, tagName));
}

/** Returns published external works whose category exactly matches the tag. */
export function filterExternalScriptsByTag<T extends ExternalScriptLike>(scripts: T[], tagName: string): T[] {
  const normalized = tagName.toLowerCase();
  return scripts.filter((script) =>
    (script.categories ?? []).some((category) => String(category).trim().toLowerCase() === normalized)
  );
}
