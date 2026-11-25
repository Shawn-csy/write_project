import { describe, expect, it } from "vitest";
import { audioWorkPublication, audioWorkPurchaseLabel, publicAudioWorkContent } from "./publicAudioWorkContent";
import type { PublicAudioWork } from "./types";

const url = "https://www.dlsite.com/maniax/work/=/product_id/RJ01752634.html";

describe("public audio work content", () => {
  it("moves repeat credits and purchase lines out of the prose for the HR Lab catalog", () => {
    const work: PublicAudioWork = {
      id: "audio", title: "作品", url,
      description: "聲演：伊橙/Kurihara Risako\n成人向・R18\nDLsite 購買頁",
      credits: [{
        role: "recording", sourceRole: "錄音師", creditedAs: "作者甲",
        provenance: "official_page", sourceUrl: "https://example.com/credits",
      }],
    };
    expect(publicAudioWorkContent(work, [{ name: "伊橙/Kurihara Risako" }])).toEqual({
      isAdult: true, introduction: "", sources: ["https://example.com/credits"],
    });
    expect(audioWorkPurchaseLabel(url)).toBe("DLsite 購買頁");
  });

  it("preserves unmatched credits and unrelated sources", () => {
    const work = {
      id: "audio", title: "作品", url,
      description: "聲演：甲、乙\n後製：丙\nCxC 作品頁\n故事摘要",
    };
    expect(publicAudioWorkContent(work, [{ name: "甲" }]).introduction).toBe(work.description);
  });
  it("does not promote an old CxC update note to a release date", () => {
    const post = {
      id: "audio", title: "作品", url: "https://cxc.today/@studio/work/1",
      description: "故事摘要\nCxC 最後更新：2026-10-28",
      publishedAt: Date.UTC(2026, 9, 28),
    };
    expect(publicAudioWorkContent(post, []).introduction).toBe("故事摘要");
    expect(audioWorkPublication(post)).toBeNull();
    expect(audioWorkPublication({ ...post, url: "https://cxc.today/@studio/track/1" })?.label).toBe("上架");
  });

});
