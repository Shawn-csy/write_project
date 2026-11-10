import type { ExternalPublicScript, PublicOrg, PublicScript } from "./types";
import { externalEntityHref } from "./externalEntity";

function isExternalScript(script: PublicScript | ExternalPublicScript): script is ExternalPublicScript {
  return typeof (script as ExternalPublicScript).sourceUrl === "string";
}

export function demoScriptSummary(script: PublicScript | ExternalPublicScript): string {
  const external = isExternalScript(script);
  const raw = external
    ? script.summary || script.remoteSummary || ""
    : script.synopsis || "";
  const descriptionStart = external ? raw.indexOf("作品描述") : -1;
  const description = descriptionStart >= 0
    ? raw.slice(descriptionStart + "作品描述".length).split(/適合標籤|人物設定|角色設定|演繹指示|標記說明/)[0]
    : raw;
  return description.replace(/\s+/g, " ").trim().slice(0, 240);
}

export function demoScriptOrganization(
  script: PublicScript | ExternalPublicScript,
  organizations: PublicOrg[] = [],
): { name: string; href: string } | null {
  const external = isExternalScript(script);
  const name = (external ? script.organizationName : script.organization?.name)?.trim();
  if (!name) return null;
  const linkedId = external ? "" : script.organization?.id;
  const known = organizations.find((org) => org.id === linkedId || org.name.trim() === name);
  const href = known ? `/org/${encodeURIComponent(known.id)}` : external
    ? externalEntityHref("org", name, script.organizationUrl)
    : "";
  return href ? { name, href } : null;
}
