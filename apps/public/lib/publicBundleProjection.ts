export const PUBLIC_BUNDLE_SECTIONS = [
  "scripts", "personas", "organizations", "topTags", "banner", "demoBanner",
  "externalPublicScripts", "demoSubmissions", "audioWorks", "activityPages", "productionResources",
] as const;
export type PublicBundleSection = (typeof PUBLIC_BUNDLE_SECTIONS)[number];

const allowedSections = new Set<string>(PUBLIC_BUNDLE_SECTIONS);

/** null means the full bundle; false means an invalid projection request. */
export function parseBundleProjection(url: URL): string[] | false | null {
  if (url.pathname !== "/api/public-bundle" || !url.search) return null;
  if ([...url.searchParams.keys()].some((key) => key !== "sections")) return false;
  const values = url.searchParams.getAll("sections");
  if (values.length !== 1) return false;
  const sections = values[0].split(",");
  if (sections.length > allowedSections.size || new Set(sections).size !== sections.length ||
      sections.some((section) => !allowedSections.has(section))) return false;
  return sections;
}
