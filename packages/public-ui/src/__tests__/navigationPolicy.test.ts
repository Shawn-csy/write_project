import { describe, expect, it } from "vitest";
import {
  scriptRequiresAgeGate,
  getScriptNavigationPolicy,
  buildNavigationPolicyMap,
} from "../gallery/navigationPolicy";
import { enrichScript } from "../gallery/filterModel";
import type { GalleryScriptInput } from "../gallery/filterModel";

function makeScript(tags: string[] = [], overrides: Partial<GalleryScriptInput> = {}): ReturnType<typeof enrichScript> {
  return enrichScript({
    id: "s1",
    title: "Test",
    customMetadata: [],
    licenseCommercial: "",
    licenseDerivative: "",
    licenseNotify: "",
    persona: null,
    tags,
    views: 0,
    lastModified: 1000,
    ...overrides,
  });
}

// ─── scriptRequiresAgeGate ────────────────────────────────────────────────────

describe("scriptRequiresAgeGate", () => {
  it("no tags → false", () => {
    expect(scriptRequiresAgeGate(makeScript([]))).toBe(false);
  });

  it("'成人向' tag → true", () => {
    expect(scriptRequiresAgeGate(makeScript(["成人向"]))).toBe(true);
  });

  it("'R-18' tag → true", () => {
    expect(scriptRequiresAgeGate(makeScript(["R-18"]))).toBe(true);
  });

  it("'r18' tag (lowercase variant) → true", () => {
    expect(scriptRequiresAgeGate(makeScript(["r18"]))).toBe(true);
  });

  it("'18+' tag → true", () => {
    expect(scriptRequiresAgeGate(makeScript(["18+"]))).toBe(true);
  });

  it("general-audience tag '全年齡向' → false", () => {
    expect(scriptRequiresAgeGate(makeScript(["全年齡向"]))).toBe(false);
  });

  it("non-segment custom tag → false", () => {
    expect(scriptRequiresAgeGate(makeScript(["奇幻", "冒險"]))).toBe(false);
  });

  it("mixed adult + general tags → true (adult wins)", () => {
    expect(scriptRequiresAgeGate(makeScript(["全年齡向", "成人向"]))).toBe(true);
  });
});

// ─── getScriptNavigationPolicy ────────────────────────────────────────────────

describe("getScriptNavigationPolicy", () => {
  it("no tags, no terms → reason=none, showGateIndicator=false", () => {
    const policy = getScriptNavigationPolicy(makeScript([]), false);
    expect(policy.reason).toBe("none");
    expect(policy.showGateIndicator).toBe(false);
  });

  it("adult tag, no terms → reason=age-gate, showGateIndicator=true", () => {
    const policy = getScriptNavigationPolicy(makeScript(["成人向"]), false);
    expect(policy.reason).toBe("age-gate");
    expect(policy.showGateIndicator).toBe(true);
  });

  it("adult tag, terms active → reason=age-gate (age-gate takes priority)", () => {
    const policy = getScriptNavigationPolicy(makeScript(["R-18"]), true);
    expect(policy.reason).toBe("age-gate");
    expect(policy.showGateIndicator).toBe(true);
  });

  it("no adult tag, terms active → reason=terms-consent, showGateIndicator=false", () => {
    const policy = getScriptNavigationPolicy(makeScript([]), true);
    expect(policy.reason).toBe("terms-consent");
    expect(policy.showGateIndicator).toBe(false);
  });

  it("scriptId is set on policy", () => {
    const script = makeScript([], { id: "abc-123" });
    const policy = getScriptNavigationPolicy(script, false);
    expect(policy.scriptId).toBe("abc-123");
  });
});

// ─── buildNavigationPolicyMap ─────────────────────────────────────────────────

describe("buildNavigationPolicyMap", () => {
  it("empty input → empty map", () => {
    expect(buildNavigationPolicyMap([], false).size).toBe(0);
  });

  it("map keyed by script id", () => {
    const scripts = [
      makeScript([], { id: "x1" }),
      makeScript(["成人向"], { id: "x2" }),
    ];
    const map = buildNavigationPolicyMap(scripts, false);
    expect(map.has("x1")).toBe(true);
    expect(map.has("x2")).toBe(true);
    expect(map.get("x1")?.reason).toBe("none");
    expect(map.get("x2")?.reason).toBe("age-gate");
  });

  it("termsRequired=true affects non-adult entries", () => {
    const scripts = [makeScript([], { id: "y1" })];
    const map = buildNavigationPolicyMap(scripts, true);
    expect(map.get("y1")?.reason).toBe("terms-consent");
  });

  it("termsRequired=false, adult script → age-gate", () => {
    const scripts = [makeScript(["R-18"], { id: "y2" })];
    const map = buildNavigationPolicyMap(scripts, false);
    expect(map.get("y2")?.reason).toBe("age-gate");
    expect(map.get("y2")?.showGateIndicator).toBe(true);
  });
});
