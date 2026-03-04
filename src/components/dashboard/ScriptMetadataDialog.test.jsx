import { describe, expect, it } from "vitest";
import { buildPublishChecklist } from "./ScriptMetadataDialog";

describe("buildPublishChecklist", () => {
  it("marks required and recommended fields separately", () => {
    const checklist = buildPublishChecklist({
      title: "My Script",
      identity: "persona:p1",
      licenseCommercial: "",
      licenseDerivative: "",
      licenseNotify: "",
      coverUrl: "",
      synopsis: "",
      tags: [],
      targetAudience: "",
      contentRating: ""
    });

    expect(checklist.missingRequired.map((item) => item.key)).toEqual(["audience", "rating", "license"]);
    expect(checklist.missingRecommended.map((item) => item.key)).toEqual(["cover", "synopsis", "tags"]);
  });

  it("passes required checks even when optional fields are empty", () => {
    const checklist = buildPublishChecklist({
      title: "My Script",
      identity: "persona:p1",
      licenseCommercial: "allow",
      licenseDerivative: "allow",
      licenseNotify: "required",
      coverUrl: "",
      synopsis: "",
      tags: [],
      targetAudience: "一般向",
      contentRating: "一般"
    });

    expect(checklist.missingRequired).toHaveLength(0);
    expect(checklist.missingRecommended.map((item) => item.key)).toEqual(["cover", "synopsis", "tags"]);
  });
});
