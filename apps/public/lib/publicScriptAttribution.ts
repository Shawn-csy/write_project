import { externalEntityHref } from "./externalEntity";
import type { ExternalPublicScript, PublicScript } from "./types";

function isExternalScript(script: PublicScript | ExternalPublicScript): script is ExternalPublicScript {
  return typeof script.sourceUrl === "string";
}

export function publicScriptAttribution(script: PublicScript | ExternalPublicScript | undefined): {
  authorName: string;
  authorHref?: string;
  authorAvatarUrl?: string;
} {
  if (!script) return { authorName: "" };
  if (isExternalScript(script)) {
    const authorName = script.authorName?.trim() || "";
    return {
      authorName,
      authorHref: authorName
        ? script.authorPersonaId ? `/author/${encodeURIComponent(script.authorPersonaId)}`
          : externalEntityHref("author", authorName, script.authorUrl)
        : undefined,
      authorAvatarUrl: script.authorAvatarUrl || undefined,
    };
  }
  const mode = script.authorDisplayMode?.trim().toLowerCase();
  const custom = script.authorOverrideName?.trim();
  if (custom || mode === "override") return { authorName: custom || "" };
  const persona = mode !== "owner" ? script.persona : undefined;
  const authorName = persona?.displayName?.trim() || script.owner?.displayName?.trim() || "";
  const id = persona?.displayName?.trim() ? persona.id?.trim() : undefined;
  const authorHref = id && id !== "override-author" && id !== "header-author-fallback"
    ? `/author/${encodeURIComponent(id)}`
    : undefined;

  return {
    authorName,
    authorHref,
    authorAvatarUrl: persona?.avatar || (persona?.displayName ? undefined : script.owner?.avatar || script.owner?.avatarUrl),
  };
}
