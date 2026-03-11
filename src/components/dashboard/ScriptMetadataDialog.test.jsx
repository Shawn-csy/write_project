import { describe, expect, it } from "vitest";
import {
  buildPublishChecklist,
  getCollapsedSectionsAfterTabSync,
} from "./ScriptMetadataDialog";

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
      targetAudience: "全性向",
      contentRating: "一般"
    });

    expect(checklist.missingRequired).toHaveLength(0);
    expect(checklist.missingRecommended.map((item) => item.key)).toEqual(["cover", "synopsis", "tags"]);
  });
});

describe("getCollapsedSectionsAfterTabSync", () => {
  const allCollapsed = {
    basic: true,
    publish: true,
    exposure: true,
    activity: true,
    demo: true,
    advanced: true,
  };

  it("does not expand any section when tab sync is passive", () => {
    const result = getCollapsedSectionsAfterTabSync(allCollapsed, "basic", false);
    expect(result).toBe(allCollapsed);
  });

  it("expands only the mapped section when tab sync is intentional", () => {
    const result = getCollapsedSectionsAfterTabSync(allCollapsed, "publish", true);
    expect(result).toEqual({
      ...allCollapsed,
      publish: false,
    });
  });

  it("ignores unknown tab keys", () => {
    const result = getCollapsedSectionsAfterTabSync(allCollapsed, "unknown", true);
    expect(result).toBe(allCollapsed);
  });

  it("expands demo section when jumping from checklist tabs", () => {
    const result = getCollapsedSectionsAfterTabSync(allCollapsed, "demo", true);
    expect(result).toEqual({
      ...allCollapsed,
      demo: false,
    });
  });
});
