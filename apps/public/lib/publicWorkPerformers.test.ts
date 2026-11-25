import { describe, expect, it } from "vitest";
import { demoArtwork } from "./demoArtwork";
import { mergePublicDemoLinks, parsePublicDemoLinks, publicSubmittedDemoLink } from "./publicDemoLinks";
import { getPublicVoicePerformances } from "./publicVoicePerformances";
import { mergePublicWorkParticipations } from "./publicWorkParticipations";
import { publicAudioPerformers, publicDemoPerformers } from "./publicWorkPerformers";
import type { PublicScript, PublicWorkParticipation } from "./types";

const url = "https://youtu.be/example";
const demoCover = "https://example.com/demo.jpg";
const scriptCover = "https://example.com/script.jpg";

describe("public work compatibility", () => {
  it("merges a legacy Demo and an approved submission while keeping the linked performer and custom cover", () => {
    const legacy = parsePublicDemoLinks(JSON.stringify([{ link: url, speaker: "聲演：甲、作者：乙" }]));
    const approved = publicSubmittedDemoLink({
      id: "submitted", scriptType: "internal", scriptTitle: "台本", scriptUrl: "/read/script",
      demoUrl: url, coverUrl: demoCover, voiceActorIds: ["a"], createdAt: 50,
    });
    const [demo] = mergePublicDemoLinks([...legacy, ...approved]);
    expect(demo.coverUrl).toBe(demoCover);
    expect(publicDemoPerformers(demo, new Map([["a", { id: "a", displayName: "甲" }]]))).toMatchObject([
      { name: "甲", href: "/author/a" },
    ]);
    expect(parsePublicDemoLinks(url)[0]?.url).toBe(url);
  });

  it("inherits the old single voice identity from an approved Demo", () => {
    const demo = {
      id: "legacy-single", scriptType: "internal" as const, scriptTitle: "台本", scriptUrl: "/read/script",
      demoUrl: url, voiceActorPersonaId: "a", voiceActorIds: [], createdAt: 50,
    };
    expect(publicSubmittedDemoLink(demo)[0]?.voiceActorIds).toEqual(["a"]);
    expect(getPublicVoicePerformances("a", { demoSubmissions: [demo] })[0]?.voiceActorIds).toEqual(["a"]);
  });

  it("hides only fully matched combined audio credits and preserves unknown wording", () => {
    const combined = (creditedAs: string) => ({
      role: "voice_actor", sourceRole: "聲優", creditedAs, provenance: "official_page" as const, sourceUrl: url,
    });
    expect(publicAudioPerformers({
      id: "audio", title: "音聲", url,
      voiceActors: [{ id: "a", name: "伊橙/Kurihara Risako" }, { id: "b", name: "葉月" }],
      credits: [combined("伊橙/Kurihara Risako、葉月"), combined("葉月／待核署名")],
    }).map((actor) => actor.name)).toEqual(["伊橙/Kurihara Risako", "葉月", "葉月／待核署名"]);
  });

  it("deduplicates a reviewed alias only if its known identity appears on the same work", () => {
    const work = {
      id: "audio", title: "音聲", url,
      credits: [{ role: "voice_actor", sourceRole: "聲優", creditedAs: "楓林晚", provenance: "official_page" as const, sourceUrl: url }],
    };
    const actor = { id: "826f24e7-1fac-4718-8ac4-c7682eb8bffb", name: "晚晚" };
    expect(publicAudioPerformers({ ...work, voiceActors: [actor] })).toMatchObject([{ name: "晚晚", href: `/author/${actor.id}` }]);
    expect(publicAudioPerformers(work)).toMatchObject([{ name: "楓林晚" }]);
  });

  it("keeps private voice identity out of published credits", () => {
    const people = new Map([["hidden", { id: "hidden", displayName: "身份資料", voiceActorHidden: true }]]);
    expect(publicDemoPerformers({
      voiceActorIds: ["hidden"],
      manualVoiceActors: [{ name: "公開署名", personaId: "hidden" }],
    }, people)).toMatchObject([{ name: "公開署名", href: undefined }]);
  });

  it("keeps script artwork separate so it is the last fallback on an actor profile", () => {
    const script = { id: "script", title: "台本", coverUrl: scriptCover, activityDemoLinks: JSON.stringify([
      { id: "with-cover", url, coverUrl: demoCover, voiceActorIds: ["a"] },
      { id: "without-cover", url: "https://youtu.be/second", voiceActorIds: ["a"] },
      { id: "off-platform", url: "https://example.com/demo", voiceActorIds: ["a"] },
    ]) } as PublicScript;
    const works = getPublicVoicePerformances("a", { scripts: [script] });
    expect(works.map((work) => demoArtwork(work.demoUrl, work.coverUrl, work.scriptCoverUrl))).toEqual([
      demoCover, "https://img.youtube.com/vi/second/hqdefault.jpg", scriptCover,
    ]);
  });

  it("uses linked audio credits once and retains legacy-only work", () => {
    expect(publicAudioPerformers({
      id: "audio", title: "音聲", url, voiceActors: [{ id: "a", name: "甲" }],
      credits: [{ role: "voice_actor", sourceRole: "聲優", creditedAs: "甲", provenance: "official_page", sourceUrl: url, personaId: "a" }],
    })).toEqual([{ name: "甲", href: "/author/a" }]);
    const current: PublicWorkParticipation = { id: "new", title: "作品", url, coverUrl: "", creditedAs: "", creditRole: "voice_actor" };
    expect(mergePublicWorkParticipations([current], [
      { ...current, id: "old", coverUrl: demoCover },
      { ...current, id: "legacy-only", url: "" },
    ])).toMatchObject([{ id: "new", coverUrl: demoCover }, { id: "legacy-only" }]);
  });
});
