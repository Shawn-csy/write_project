import { describe, it, expect } from "vitest";
import robots from "../robots";

const BASE = "https://open-scripts.shawnup.com";

describe("robots", () => {
  it("includes sitemap URL", () => {
    const r = robots();
    expect(r.sitemap).toBe(`${BASE}/sitemap.xml`);
  });

  it("allows public content routes", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const allowed = rules.flatMap((rule) => (Array.isArray(rule.allow) ? rule.allow : rule.allow ? [rule.allow] : []));
    expect(allowed).toContain("/");
    expect(allowed).toContain("/read/");
    expect(allowed).toContain("/author/");
    expect(allowed).toContain("/org/");
    expect(allowed).toContain("/series/");
  });

  it("disallows workspace/admin/api routes", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const disallowed = rules.flatMap((rule) => (Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []));
    expect(disallowed).toContain("/dashboard");
    expect(disallowed).toContain("/admin");
    expect(disallowed).toContain("/api/");
  });

  it("disallows retired /gallery", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const disallowed = rules.flatMap((rule) => (Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : []));
    expect(disallowed).toContain("/gallery");
  });

  it("includes AI-bot rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const agents = rules.map((rule) => rule.userAgent);
    expect(agents).toContain("GPTBot");
    expect(agents).toContain("ClaudeBot");
    expect(agents).toContain("PerplexityBot");
    expect(agents).toContain("Google-Extended");
  });

  it("AI-bot rules allow /read/, /author/, /llms.txt, /.well-known/llms.txt, /api/public-scripts/", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const botRule = rules.find((rule) => rule.userAgent === "GPTBot");
    expect(botRule).toBeDefined();
    const allowed = Array.isArray(botRule!.allow) ? botRule!.allow : botRule!.allow ? [botRule!.allow] : [];
    expect(allowed).toContain("/read/");
    expect(allowed).toContain("/author/");
    expect(allowed).toContain("/llms.txt");
    expect(allowed).toContain("/.well-known/llms.txt");
    expect(allowed).toContain("/api/public-scripts/");
  });
});
