import type { ExternalPublicScript, PublicOrg } from "@/lib/types";

export function externalScriptsForOrganization(org: PublicOrg, scripts: ExternalPublicScript[]): ExternalPublicScript[] {
  const name = org.name.trim().toLocaleLowerCase();
  return scripts.filter((script) =>
    script.status === "published" && script.organizationName?.trim().toLocaleLowerCase() === name
  );
}
