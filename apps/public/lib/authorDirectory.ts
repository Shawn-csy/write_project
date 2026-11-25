import { authorDirectoryWorks } from "./authorDirectoryWorks";
import { buildGalleryAuthorIndex } from "./galleryAuthorIndex";
import { parseHomepageBundle, type HomepageBundleResponse } from "./homepageBundle";

export const AUTHOR_DIRECTORY_SECTIONS = ["scripts", "externalPublicScripts", "personas"] as const;

export function buildAuthorDirectory(bundle: HomepageBundleResponse) {
  const { scripts, externalPublicScripts, personas } = parseHomepageBundle(bundle);
  const externalScripts = externalPublicScripts.filter((script) => script.status === "published");
  const { authors, searchIndex } = buildGalleryAuthorIndex(personas, scripts, externalScripts);

  return {
    authors: authors.map(({ id, displayName, avatar, bio, links, tags, externalHref, organizations }) => ({
      id, displayName, avatar, bio, links, tags, externalHref, organizations,
    })),
    searchIndex: searchIndex.map(({ id, displayName, searchText, tags }) => ({ id, displayName, searchText, tags })),
    worksByAuthor: Object.fromEntries(authors.map((author) => [author.id, authorDirectoryWorks(author, scripts, externalPublicScripts)])),
  };
}

export type AuthorDirectory = ReturnType<typeof buildAuthorDirectory>;
