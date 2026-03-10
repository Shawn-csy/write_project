import { describe, expect, it } from "vitest";
import { buildCustomFieldsFromRawEntries } from "./scriptMetadataUtils";

describe("buildCustomFieldsFromRawEntries", () => {
  it("filters controlled metadata keys from custom fields", () => {
    const rows = [
      { key: "AuthorDisplayMode", value: "override" },
      { key: "LicenseCommercial", value: "allow" },
      { key: "Audience", value: "一般向" },
      { key: "ContentRating", value: "全年齡向" },
      { key: "MyCustomKey", value: "hello" },
    ];

    const result = buildCustomFieldsFromRawEntries(rows);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("MyCustomKey");
  });
});

