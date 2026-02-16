import { describe, expect, it } from "vitest";
import { buildPublishChecklist } from "./ScriptMetadataDialog";

describe("buildPublishChecklist", () => {
  it("marks required and recommended fields separately", () => {
    const checklist = buildPublishChecklist({
      title: "My Script",
      identity: "persona:p1",
      license: "",
      licenseTerms: [],
      coverUrl: "",
      synopsis: "",
      tags: [],
    });

    expect(checklist.missingRequired.map((item) => item.key)).toEqual(["license"]);
    expect(checklist.missingRecommended.map((item) => item.key)).toEqual(["cover", "synopsis", "tags"]);
  });

  it("passes required checks even when optional fields are empty", () => {
    const checklist = buildPublishChecklist({
      title: "My Script",
      identity: "persona:p1",
      license: "CC BY 4.0",
      licenseTerms: [],
      coverUrl: "",
      synopsis: "",
      tags: [],
    });

    expect(checklist.missingRequired).toHaveLength(0);
    expect(checklist.missingRecommended.map((item) => item.key)).toEqual(["cover", "synopsis", "tags"]);
  });
});
