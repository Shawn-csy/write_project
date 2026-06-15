import { describe, expect, it } from "vitest";
import type { PublicScript } from "./types";
import { buildScriptOverlayProps } from "./scriptProjection";
import { getScriptDescription } from "./scriptDescription";

const base: PublicScript = { id: "test", title: "Test" };

// ---------------------------------------------------------------------------
// getScriptDescription
// ---------------------------------------------------------------------------

describe("getScriptDescription", () => {
  it("returns synopsis when present", () => {
    expect(getScriptDescription({ ...base, synopsis: "hello" })).toBe("hello");
  });

  it("truncates synopsis at 300 chars", () => {
    const long = "a".repeat(400);
    expect(getScriptDescription({ ...base, synopsis: long })).toHaveLength(300);
  });

  it("falls back to customMetadata synopsis entry", () => {
    expect(
      getScriptDescription({
        ...base,
        customMetadata: [{ key: "摘要", value: "meta synopsis" }],
      })
    ).toBe("meta synopsis");
  });

  it("falls back to customMetadata outline entry", () => {
    expect(
      getScriptDescription({
        ...base,
        customMetadata: [{ key: "outline", value: "outline text" }],
      })
    ).toBe("outline text");
  });

  it("skips <t> marker lines when falling back to content", () => {
    expect(
      getScriptDescription({
        ...base,
        content: "<t> EXT.地點.NIGHT.SCENE 1\n正常台詞在這裡",
      })
    ).toBe("正常台詞在這裡");
  });

  it("skips /sfx marker lines", () => {
    expect(
      getScriptDescription({ ...base, content: "/sfx 音效說明\n台詞" })
    ).toBe("台詞");
  });

  it("skips /d direction lines", () => {
    expect(
      getScriptDescription({ ...base, content: "/d 右前\n台詞" })
    ).toBe("台詞");
  });

  it("skips multiple consecutive marker lines", () => {
    expect(
      getScriptDescription({
        ...base,
        content: "<t> scene\n/sfx sfx\n/d dir\n第一句台詞",
      })
    ).toBe("第一句台詞");
  });

  it("returns default when content is all markers", () => {
    expect(
      getScriptDescription({ ...base, content: "<t> scene\n/sfx sfx" })
    ).toBe("公開劇本閱讀頁");
  });

  it("returns default when no synopsis or content", () => {
    expect(getScriptDescription(base)).toBe("公開劇本閱讀頁");
  });

  it("truncates content fallback at 200 chars", () => {
    const long = "a".repeat(300);
    expect(getScriptDescription({ ...base, content: long })).toHaveLength(200);
  });
});

// ---------------------------------------------------------------------------
// buildScriptOverlayProps — customFields SYSTEM_KEYS exclusion
// ---------------------------------------------------------------------------

describe("buildScriptOverlayProps — customFields", () => {
  it("excludes preface-rule keys from customFields", () => {
    const script: PublicScript = {
      ...base,
      customMetadata: [
        { key: "outline", value: "大綱內容" },
        { key: "rolesetting", value: "角色設定內容" },
        { key: "backgroundinfo", value: "背景" },
        { key: "performanceinstruction", value: "指示" },
        { key: "openingintro", value: "引言" },
        { key: "chaptersettings", value: "章節" },
      ],
    };
    const { customFields } = buildScriptOverlayProps(script);
    expect(customFields).toHaveLength(0);
  });

  it("excludes audience/rating/license keys from customFields", () => {
    const script: PublicScript = {
      ...base,
      customMetadata: [
        { key: "targetaudience", value: "全年齡" },
        { key: "contentrating", value: "普通" },
        { key: "license", value: "CC BY" },
        { key: "licensecommercial", value: "no" },
        { key: "licensederivative", value: "yes" },
        { key: "licensenotify", value: "no" },
        { key: "licensespecialterms", value: "none" },
        { key: "licensetags", value: "tag" },
      ],
    };
    const { customFields } = buildScriptOverlayProps(script);
    expect(customFields).toHaveLength(0);
  });

  it("excludes author/series/synopsis/contact system keys from customFields", () => {
    const script: PublicScript = {
      ...base,
      customMetadata: [
        { key: "author", value: "someone" },
        { key: "authordisplaymode", value: "persona" },
        { key: "seriesorder", value: "1" },
        { key: "synopsis", value: "摘要文字" },
        { key: "contact", value: '{"twitter":"@foo"}' },
        { key: "聯絡方式", value: "email" },
      ],
    };
    const { customFields } = buildScriptOverlayProps(script);
    expect(customFields).toHaveLength(0);
  });

  it("passes through unknown custom keys not in SYSTEM_KEYS", () => {
    const script: PublicScript = {
      ...base,
      customMetadata: [
        { key: "myCustomKey", value: "someValue" },
        { key: "anotherKey", value: "anotherValue" },
        // system key mixed in — must be excluded
        { key: "license", value: "CC BY" },
      ],
    };
    const { customFields } = buildScriptOverlayProps(script);
    expect(customFields).toHaveLength(2);
    expect(customFields.map((f) => f.key)).toEqual(["myCustomKey", "anotherKey"]);
  });

  it("excludes entries with empty key or value", () => {
    const script: PublicScript = {
      ...base,
      customMetadata: [
        { key: "", value: "no key" },
        { key: "myKey", value: "" },
        { key: "myKey", value: "valid" },
      ],
    };
    const { customFields } = buildScriptOverlayProps(script);
    expect(customFields).toHaveLength(1);
    expect(customFields[0].key).toBe("myKey");
  });

  it("excludes traditional-Chinese system key variants", () => {
    const script: PublicScript = {
      ...base,
      customMetadata: [
        { key: "觀眾取向", value: "全年齡" },
        { key: "內容分級", value: "普通" },
        { key: "授權", value: "CC BY" },
        { key: "摘要", value: "synopsis text" },
      ],
    };
    const { customFields } = buildScriptOverlayProps(script);
    expect(customFields).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildScriptOverlayProps — dedicated fields populated correctly
// ---------------------------------------------------------------------------

describe("buildScriptOverlayProps — dedicated fields", () => {
  it("populates targetAudience from customMetadata", () => {
    const script: PublicScript = {
      ...base,
      customMetadata: [{ key: "targetaudience", value: "成人" }],
    };
    expect(buildScriptOverlayProps(script).targetAudience).toBe("成人");
  });

  it("populates targetAudience from 觀眾取向 key", () => {
    const script: PublicScript = {
      ...base,
      customMetadata: [{ key: "觀眾取向", value: "全年齡" }],
    };
    expect(buildScriptOverlayProps(script).targetAudience).toBe("全年齡");
  });

  it("populates prefaceItems from outline top-level field", () => {
    const script: PublicScript = { ...base, outline: "大綱內容" };
    const { prefaceItems } = buildScriptOverlayProps(script);
    const item = prefaceItems.find((p) => p.id === "outline");
    expect(item?.value).toBe("大綱內容");
  });

  it("populates commercialUse from licenseCommercial", () => {
    const script: PublicScript = { ...base, licenseCommercial: "no" };
    expect(buildScriptOverlayProps(script).commercialUse).toBe("no");
  });
});
