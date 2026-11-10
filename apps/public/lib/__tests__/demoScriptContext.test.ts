import { expect, it } from "vitest";
import { demoScriptOrganization, demoScriptSummary } from "../demoScriptContext";
import { getPublicVoicePerformances } from "../publicVoicePerformances";
import type { ExternalPublicScript } from "../types";

const script: ExternalPublicScript = {
  id: "external-1",
  sourceUrl: "https://example.com/script",
  title: "放學後",
  authorName: "阡行",
  authorUrl: "https://example.com/qianxing",
  status: "published",
  summary: "放學後 作品資訊 台本師 作者 作品描述 放學後的教室裡，兩人邀你一起逛街。 適合標籤 校園 人物設定 其他內容",
  organizationName: "被談聲聆",
  organizationUrl: "https://example.com",
  demoLinks: [{ url: "https://youtube.com/watch?v=123", voiceActorIds: ["actor-1"] }],
};

it("extracts the work description without document metadata", () => {
  expect(demoScriptSummary(script)).toBe("放學後的教室裡，兩人邀你一起逛街。");
});

it("links a demo's organization through its script and known organization identity", () => {
  const organizations = [{ id: "org-1", name: "被談聲聆" }];
  expect(demoScriptOrganization(script, organizations)).toEqual({ name: "被談聲聆", href: "/org/org-1" });
  expect(getPublicVoicePerformances("actor-1", { externalPublicScripts: [script], organizations })[0]).toMatchObject({
    scriptSummary: "放學後的教室裡，兩人邀你一起逛街。",
    scriptAuthorName: "阡行",
    scriptAuthorHref: "/author/external/qianxing",
    organizationName: "被談聲聆",
    organizationHref: "/org/org-1",
  });
});
