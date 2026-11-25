import { toAuthorLike } from "./galleryProjection";
import { combinePublicIdentities } from "./publicIdentity";
import { getPublicPersonaTags } from "./publicPersonaTags";
import type { ExternalPublicScript, PublicPersona, PublicScript } from "./types";

export function buildGalleryAuthorIndex(personas: PublicPersona[], scripts: PublicScript[], publishedExternalScripts: ExternalPublicScript[]) {
  const allAuthors = combinePublicIdentities(
    personas.map((author) => ({ ...author, tags: getPublicPersonaTags(author.tags) })),
    publishedExternalScripts,
  );

  const titlesByAuthor = new Map<string, string[]>();
  function addTitle(id: string | undefined | null, title: string) {
    if (!id) return;
    const titles = titlesByAuthor.get(id);
    if (titles) titles.push(title);
    else titlesByAuthor.set(id, [title]);
  }
  for (const script of scripts) addTitle(script.persona?.id, script.title);
  for (const script of publishedExternalScripts) addTitle(script.authorPersonaId, script.title);

  const authors = allAuthors.filter((author) => author.externalHref
    || titlesByAuthor.has(author.id)
    || author.workParticipations?.some((work) => work.creditRole === "scriptwriter")
    || (author.roles?.includes("scriptwriter") && Array.isArray(author.roleProfiles?.scriptwriter?.commissionOffers)
      && author.roleProfiles.scriptwriter.commissionOffers.length > 0));
  const searchIndex = authors.map((author) => {
    const authorLike = toAuthorLike(author);
    return {
      ...authorLike,
      searchText: [authorLike.searchText, ...(titlesByAuthor.get(author.id) || [])].filter(Boolean).join(" "),
    };
  });
  return { authors, searchIndex };
}
