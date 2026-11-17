import { describe, expect, it } from "vitest";
import { buildResourceDirectory, selectResourceDirectory, type ProductionResource } from "./resourceDirectory";

describe("resource directory projection", () => {
  it("keeps a recording professional and a studio as separate identities", () => {
    const resources: ProductionResource[] = [
      { id: "person", personaId: "person", name: "大白", categories: ["recording_studio"], recordingEntityType: "person", commissionCategories: ["recording_studio"], summary: "錄音師", websiteUrl: "", works: [] },
      { id: "studio", personaId: "studio", name: "流浪白鷺聲音工作室", categories: ["recording_studio"], recordingEntityType: "studio", summary: "錄音室", websiteUrl: "", works: [{ id: "w", title: "作品", url: "https://example.com/work", coverUrl: "", creditRole: "recording_studio", creditedAs: "工作室" }] },
    ];
    const rows = selectResourceDirectory(buildResourceDirectory([], resources), "recording_studio", "");
    expect(rows.map((r) => r.id)).toEqual(["studio"]);
    expect(rows[0].works).toHaveLength(1);
    expect(rows.map((r) => r.href)).toEqual(["/author/studio"]);
    expect(buildResourceDirectory([], resources).find((r) => r.id === "person")?.works).toHaveLength(0);
    expect(selectResourceDirectory(buildResourceDirectory([], resources), "recording_engineer", "").map((r) => r.id)).toEqual(["person"]);
  });
  it("keeps legacy recording identities visible until their type is reviewed", () => {
    const resources: ProductionResource[] = [{ id: "legacy", personaId: "legacy", name: "待核錄音身份", categories: ["recording_studio"], summary: "", websiteUrl: "", works: [{ id: "w", title: "作品", url: "https://example.com/work", coverUrl: "", creditRole: "recording_studio", creditedAs: "署名" }] }];
    const directory = buildResourceDirectory([], resources);
    expect(selectResourceDirectory(directory, "recording_unclassified", "").map((row) => row.id)).toEqual(["legacy"]);
    expect(selectResourceDirectory(directory, "recording_studio", "")).toEqual([]);
    expect(selectResourceDirectory(directory, "recording_engineer", "")).toEqual([]);
  });
  it("keeps workParticipations authoritative and excludes hidden voice identities", () => {
    const rows = buildResourceDirectory([
      { id: "hidden", displayName: "隱藏", roles: ["voice_actor"], voiceActorHidden: true },
      { id: "p", displayName: "公開", roles: ["voice_actor", "post_production"], workParticipations: [] },
    ], [{ id: "p", personaId: "p", name: "舊名", categories: ["post_production"], summary: "", websiteUrl: "", works: [{ id: "old", title: "過期", url: "https://example.com/old", coverUrl: "", creditRole: "post_production", creditedAs: "" }] }]);
    expect(selectResourceDirectory(rows, "voice_actor", "").map((r) => r.name)).toEqual(["公開"]);
    expect(selectResourceDirectory(rows, "post_production", "")).toEqual([]);
  });
});
