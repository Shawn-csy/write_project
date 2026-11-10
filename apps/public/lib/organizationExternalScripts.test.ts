import { describe, expect, it } from "vitest";
import type { ExternalPublicScript, PublicOrg } from "@/lib/types";
import { externalScriptsForOrganization } from "./organizationExternalScripts";

describe("externalScriptsForOrganization", () => {
  it("matches the published works credited to the organization", () => {
    const org = { id: "org-1", name: "被談聲聆" } as PublicOrg;
    const scripts = [
      { id: "one", organizationName: "被談聲聆", status: "published" },
      { id: "two", organizationName: "被談聲聆", status: "draft" },
      { id: "three", organizationName: "另一間工作室", status: "published" },
    ] as ExternalPublicScript[];
    expect(externalScriptsForOrganization(org, scripts).map((script) => script.id)).toEqual(["one"]);
  });
});
