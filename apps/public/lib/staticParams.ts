import { apiFetch } from "@/lib/api";
import { externalEntitySlug } from "@/lib/externalEntity";
import type { ExternalPublicScript, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";

interface PublicBundle {
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
}

let bundleRequest: Promise<PublicBundle> | undefined;

function getBundle(): Promise<PublicBundle> {
  bundleRequest ??= apiFetch<PublicBundle>("/public-bundle");
  return bundleRequest;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function uniqueNames(values: Array<string | null | undefined>): string[] {
  const names = new Map<string, string>();
  for (const value of values) {
    const name = value?.trim();
    if (name) names.set(name.toLocaleLowerCase(), names.get(name.toLocaleLowerCase()) ?? name);
  }
  return Array.from(names.values());
}

function uniqueExternalEntities(items: ExternalPublicScript[], kind: "author" | "org"): string[] {
  const entities = new Map<string, string>();
  for (const item of items) {
    if (item.status !== "published") continue;
    const name = kind === "author" ? item.authorName?.trim() : item.organizationName?.trim();
    const profileUrl = kind === "author" ? item.authorUrl : item.organizationUrl;
    if (!name) continue;
    const slug = externalEntitySlug(name, profileUrl);
    entities.set(slug.toLocaleLowerCase(), slug);
  }
  return Array.from(entities.values());
}

export async function getStaticReadParams(): Promise<Array<{ id: string }>> {
  const { scripts = [] } = await getBundle();
  // A bundle that answered but listed nothing usually means the data source was
  // empty or misconfigured; baking that would publish a site with no works.
  if (scripts.length === 0 && process.env.ALLOW_EMPTY_PUBLIC_BUILD !== "1") {
    throw new Error("The public bundle contains no scripts; refusing to build an empty site. Set ALLOW_EMPTY_PUBLIC_BUILD=1 to override.");
  }
  return unique(scripts.map((script) => script.id).filter(Boolean)).map((id) => ({ id }));
}

export async function getStaticAuthorParams(): Promise<Array<{ id: string }>> {
  const personas = await apiFetch<PublicPersona[]>("/public-personas");
  return unique(personas.map((persona) => persona.id).filter(Boolean)).map((id) => ({ id }));
}

export async function getStaticOrgParams(): Promise<Array<{ id: string }>> {
  const organizations = await apiFetch<PublicOrg[]>("/public-organizations");
  return unique(organizations.map((organization) => organization.id).filter(Boolean)).map((id) => ({ id }));
}

export async function getStaticExternalAuthorParams(): Promise<Array<{ name: string }>> {
  const { externalPublicScripts = [] } = await getBundle();
  return uniqueExternalEntities(externalPublicScripts, "author").map((name) => ({ name }));
}

export async function getStaticExternalOrgParams(): Promise<Array<{ name: string }>> {
  const { externalPublicScripts = [] } = await getBundle();
  return uniqueExternalEntities(externalPublicScripts, "org").map((name) => ({ name }));
}

export async function getStaticSeriesParams(): Promise<Array<{ name: string }>> {
  const { scripts = [], externalPublicScripts = [] } = await getBundle();
  const names = uniqueNames([
    ...scripts.map((script) => script.series?.name),
    ...externalPublicScripts.filter((item) => item.status === "published").map((item) => item.seriesName),
  ]);
  return names.map((name) => ({ name }));
}

export async function getStaticTagParams(): Promise<Array<{ name: string }>> {
  const { scripts = [], externalPublicScripts = [] } = await getBundle();
  const names = uniqueNames([
    ...scripts.flatMap((script) => (script.tags ?? []).map((tag) => typeof tag === "string" ? tag : tag.name)),
    ...externalPublicScripts
      .filter((item) => item.status === "published")
      .flatMap((item) => item.categories ?? []),
  ]);
  return names.map((name) => ({ name }));
}
