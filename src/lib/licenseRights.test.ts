import { describe, it, expect } from "vitest";
import {
  deriveUsageRights,
  deriveCcLicenseTags,
  deriveSimpleLicenseTags,
  parseBasicLicenseFromMeta,
} from "./licenseRights";

// ── deriveUsageRights ──────────────────────────────────────────────────────

describe("deriveUsageRights", () => {
  describe("CC licenses", () => {
    it("CC BY → allowCommercial=true, isFreeToUse=true", () => {
      const r = deriveUsageRights("CC BY 4.0", "");
      expect(r.allowCommercial).toBe(true);
      expect(r.isFreeToUse).toBe(true);
    });

    it("CC BY-NC → allowCommercial=false, isFreeToUse=true", () => {
      const r = deriveUsageRights("CC BY-NC 4.0", "");
      expect(r.allowCommercial).toBe(false);
      expect(r.isFreeToUse).toBe(true);
    });

    it("CC BY-NC-ND → allowCommercial=false, isFreeToUse=true", () => {
      const r = deriveUsageRights("CC BY-NC-ND 4.0", "");
      expect(r.allowCommercial).toBe(false);
      expect(r.isFreeToUse).toBe(true);
    });

    it("CC BY-SA → allowCommercial=true, isFreeToUse=true", () => {
      const r = deriveUsageRights("CC BY-SA 4.0", "");
      expect(r.allowCommercial).toBe(true);
      expect(r.isFreeToUse).toBe(true);
    });

    it("CC0 → allowCommercial=true, isFreeToUse=true", () => {
      const r = deriveUsageRights("CC0 1.0", "");
      expect(r.allowCommercial).toBe(true);
      expect(r.isFreeToUse).toBe(true);
    });
  });

  describe("All Rights Reserved", () => {
    it("returns allowCommercial=false, isFreeToUse=false", () => {
      const r = deriveUsageRights("All Rights Reserved", "");
      expect(r.allowCommercial).toBe(false);
      expect(r.isFreeToUse).toBe(false);
    });
  });

  describe("unknown license with no terms", () => {
    it("returns null for both fields", () => {
      const r = deriveUsageRights("", "");
      expect(r.allowCommercial).toBeNull();
      expect(r.isFreeToUse).toBeNull();
    });
  });

  describe("commercialRaw parameter overrides CC inference", () => {
    it("allow overrides NC restriction", () => {
      const r = deriveUsageRights("CC BY-NC 4.0", "", "allow");
      expect(r.allowCommercial).toBe(true);
    });

    it("disallow overrides CC BY allowance", () => {
      const r = deriveUsageRights("CC BY 4.0", "", "disallow");
      expect(r.allowCommercial).toBe(false);
    });

    it("accepts Chinese alias '可商用'", () => {
      const r = deriveUsageRights("", "", "可商用");
      expect(r.allowCommercial).toBe(true);
    });

    it("accepts Chinese alias '不可商用'", () => {
      const r = deriveUsageRights("", "", "不可商用");
      expect(r.allowCommercial).toBe(false);
    });
  });

  describe("terms text overrides", () => {
    it("term '可商用' → allowCommercial=true", () => {
      const r = deriveUsageRights("", "本作品可商用於任何場合");
      expect(r.allowCommercial).toBe(true);
    });

    it("term '禁止商用' → allowCommercial=false", () => {
      const r = deriveUsageRights("CC BY 4.0", "禁止商用");
      expect(r.allowCommercial).toBe(false);
    });

    it("term '可免費使用' → isFreeToUse=true", () => {
      const r = deriveUsageRights("", "可免費使用");
      expect(r.isFreeToUse).toBe(true);
    });

    it("term '需付費' → isFreeToUse=false", () => {
      const r = deriveUsageRights("CC BY 4.0", "需付費");
      expect(r.isFreeToUse).toBe(false);
    });

    it("deny term wins when both allow and deny present for commercial", () => {
      // 矛盾的 terms — deny 優先（deny && !allow）
      const r = deriveUsageRights("", "禁止商用，可商用");
      // 兩者都有，allowCommercial 維持 null（互相抵銷）
      expect(r.allowCommercial).toBeNull();
    });
  });
});

// ── deriveCcLicenseTags ────────────────────────────────────────────────────

describe("deriveCcLicenseTags", () => {
  it("non-CC returns empty array", () => {
    expect(deriveCcLicenseTags("All Rights Reserved")).toEqual([]);
    expect(deriveCcLicenseTags("")).toEqual([]);
  });

  it("CC BY 4.0 → 需署名 可商用 可改作", () => {
    const tags = deriveCcLicenseTags("CC BY 4.0");
    expect(tags).toContain("授權:需署名");
    expect(tags).toContain("授權:可商用");
    expect(tags).toContain("授權:可改作");
  });

  it("CC BY-NC → 非商用", () => {
    expect(deriveCcLicenseTags("CC BY-NC 4.0")).toContain("授權:非商用");
  });

  it("CC BY-ND → 禁止改作", () => {
    expect(deriveCcLicenseTags("CC BY-ND 4.0")).toContain("授權:禁止改作");
  });

  it("CC BY-SA → 改作需同授權", () => {
    expect(deriveCcLicenseTags("CC BY-SA 4.0")).toContain("授權:改作需同授權");
  });

  it("CC0 → 免署名", () => {
    expect(deriveCcLicenseTags("CC0 1.0")).toContain("授權:免署名");
  });

  it("CC BY-NC-SA → 非商用 + 改作需同授權", () => {
    const tags = deriveCcLicenseTags("CC BY-NC-SA 4.0");
    expect(tags).toContain("授權:非商用");
    expect(tags).toContain("授權:改作需同授權");
  });
});

// ── deriveSimpleLicenseTags ────────────────────────────────────────────────

describe("deriveSimpleLicenseTags", () => {
  it("empty input returns empty array", () => {
    expect(deriveSimpleLicenseTags()).toEqual([]);
    expect(deriveSimpleLicenseTags({})).toEqual([]);
  });

  it("allow commercial → 可商用", () => {
    const tags = deriveSimpleLicenseTags({ commercialUse: "allow" });
    expect(tags).toContain("授權:可商用");
  });

  it("disallow commercial → 不可商用", () => {
    const tags = deriveSimpleLicenseTags({ commercialUse: "disallow" });
    expect(tags).toContain("授權:不可商用");
  });

  it("allow derivative → 可改作", () => {
    const tags = deriveSimpleLicenseTags({ derivativeUse: "allow" });
    expect(tags).toContain("授權:可改作");
  });

  it("disallow derivative → 不可改作", () => {
    const tags = deriveSimpleLicenseTags({ derivativeUse: "disallow" });
    expect(tags).toContain("授權:不可改作");
  });

  it("limited derivative → 限定改作", () => {
    const tags = deriveSimpleLicenseTags({ derivativeUse: "limited" });
    expect(tags).toContain("授權:限定改作");
  });

  it("required notify → 修改需告知", () => {
    const tags = deriveSimpleLicenseTags({ notifyOnModify: "required" });
    expect(tags).toContain("授權:修改需告知");
  });

  it("not_required notify → 修改免告知", () => {
    // normalizeNotifyChoice maps "no" / "optional" → "not_required"
    const tags = deriveSimpleLicenseTags({ notifyOnModify: "no" });
    expect(tags).toContain("授權:修改免告知");
  });

  it("full set produces 3 tags", () => {
    const tags = deriveSimpleLicenseTags({
      commercialUse: "allow",
      derivativeUse: "allow",
      notifyOnModify: "required",
    });
    expect(tags).toHaveLength(3);
  });

  it("accepts Chinese alias '可商用' as commercialUse", () => {
    const tags = deriveSimpleLicenseTags({ commercialUse: "可商用" });
    expect(tags).toContain("授權:可商用");
  });
});

// ── parseBasicLicenseFromMeta ──────────────────────────────────────────────

describe("parseBasicLicenseFromMeta", () => {
  it("empty meta returns empty strings", () => {
    const r = parseBasicLicenseFromMeta({});
    expect(r.commercialUse).toBe("");
    expect(r.derivativeUse).toBe("");
    expect(r.notifyOnModify).toBe("");
  });

  it("maps licensecommercial (lowercase key)", () => {
    const r = parseBasicLicenseFromMeta({ licensecommercial: "allow" });
    expect(r.commercialUse).toBe("allow");
  });

  it("maps licenseCommercial (camelCase key)", () => {
    const r = parseBasicLicenseFromMeta({ licenseCommercial: "disallow" });
    expect(r.commercialUse).toBe("disallow");
  });

  it("maps licensederivative + licensenotify", () => {
    const r = parseBasicLicenseFromMeta({
      licensederivative: "limited",
      licensenotify: "required",
    });
    expect(r.derivativeUse).toBe("limited");
    expect(r.notifyOnModify).toBe("required");
  });

  it("unknown values normalize to empty string", () => {
    const r = parseBasicLicenseFromMeta({ licensecommercial: "maybe" });
    expect(r.commercialUse).toBe("");
  });
});
