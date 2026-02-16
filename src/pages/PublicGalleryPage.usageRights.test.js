import { describe, expect, it } from "vitest";
import { deriveUsageRights, deriveCcLicenseTags } from "../lib/licenseRights";

describe("deriveUsageRights", () => {
  it("uses CC fallback when terms do not override", () => {
    expect(deriveUsageRights("CC BY 4.0", "")).toEqual({
      allowCommercial: true,
      isFreeToUse: true,
    });
    expect(deriveUsageRights("CC BY-NC 4.0", "")).toEqual({
      allowCommercial: false,
      isFreeToUse: true,
    });
    expect(deriveUsageRights("CC BY NC SA 4.0", "")).toEqual({
      allowCommercial: false,
      isFreeToUse: true,
    });
    expect(deriveUsageRights("All Rights Reserved", "")).toEqual({
      allowCommercial: false,
      isFreeToUse: false,
    });
  });

  it("lets custom terms override CC for commercial usage", () => {
    expect(deriveUsageRights("CC BY-NC 4.0", "允許商用")).toMatchObject({
      allowCommercial: true,
    });
    expect(deriveUsageRights("CC BY 4.0", "不可商用")).toMatchObject({
      allowCommercial: false,
    });
  });

  it("lets custom terms override free-to-use status", () => {
    expect(deriveUsageRights("All Rights Reserved", "可免費使用")).toMatchObject({
      isFreeToUse: true,
    });
    expect(deriveUsageRights("CC BY 4.0", "需付費授權")).toMatchObject({
      isFreeToUse: false,
    });
  });

  it("falls back to CC when terms contain conflicting keywords", () => {
    expect(deriveUsageRights("CC BY 4.0", "允許商用，但另處又寫不可商用")).toMatchObject({
      allowCommercial: true,
    });
    expect(deriveUsageRights("All Rights Reserved", "可免費使用 但又寫需付費")).toMatchObject({
      isFreeToUse: false,
    });
  });

  it("derives 3 independent CC tags", () => {
    expect(deriveCcLicenseTags("CC BY-NC-SA 4.0")).toEqual([
      "授權:需署名",
      "授權:非商用",
      "授權:改作需同授權",
    ]);
    expect(deriveCcLicenseTags("CC BY-ND 4.0")).toEqual([
      "授權:需署名",
      "授權:可商用",
      "授權:禁止改作",
    ]);
    expect(deriveCcLicenseTags("CC0 1.0")).toEqual([
      "授權:免署名",
      "授權:可商用",
      "授權:可改作",
    ]);
  });
});
