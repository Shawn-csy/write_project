import { describe, expect, it } from "vitest";
import { metadataToCustomEntries } from "./ImportScriptDialog";

describe("ImportScriptDialog metadata mapping", () => {
  it("does not write tags into customMetadata", () => {
    const rows = metadataToCustomEntries({
      Title: "測試",
      Author: "A",
      Tags: "ASMR,療癒",
      Description: "desc",
      RoleSetting: "role",
    });

    const keys = rows.map((row) => row.key);
    expect(keys).not.toContain("Tags");
    expect(keys).toContain("Description");
    expect(keys).toContain("RoleSetting");
  });
});
