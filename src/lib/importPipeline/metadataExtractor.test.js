import { describe, expect, it } from "vitest";
import { extractMetadata } from "./metadataExtractor";

describe("metadataExtractor", () => {
  it("parses role section into RoleSetting multi payload", () => {
    const text = [
      "作品資訊",
      "Title: 測試作品",
      "人物設定",
      "小雨：冷靜的觀察者",
      "阿哲：衝動但善良",
      "環境：夜晚城市",
      "狀況：剛脫離追逐",
      "1. 第一章",
      "#C 小雨",
      "台詞",
    ].join("\n");

    const result = extractMetadata(text);
    expect(result.metadata.Title).toBe("測試作品");
    const role = JSON.parse(result.metadata.RoleSetting);
    expect(role.mode).toBe("multi");
    expect(role.items).toEqual([
      { name: "小雨", text: "冷靜的觀察者" },
      { name: "阿哲", text: "衝動但善良" },
    ]);
    const chapter = JSON.parse(result.metadata.ChapterSettings);
    expect(chapter.items[0]?.environment).toBe("夜晚城市");
    expect(chapter.items[0]?.situation).toBe("剛脫離追逐");
  });

  it("parses key-only role section header without mixing character names into metadata keys", () => {
    const text = [
      "標題：角色段落測試",
      "角色設定",
      "小雨：冷靜的觀察者",
      "阿哲：衝動但善良",
      "環境：夜晚城市",
      "狀況：剛脫離追逐",
      "#C 小雨",
      "台詞",
    ].join("\n");

    const result = extractMetadata(text);
    const role = JSON.parse(result.metadata.RoleSetting);
    expect(role.mode).toBe("multi");
    expect(role.items).toEqual([
      { name: "小雨", text: "冷靜的觀察者" },
      { name: "阿哲", text: "衝動但善良" },
    ]);
    expect(result.metadata["小雨"]).toBeUndefined();
    expect(result.metadata["阿哲"]).toBeUndefined();
    const chapter = JSON.parse(result.metadata.ChapterSettings);
    expect(chapter.items[0]?.environment).toBe("夜晚城市");
    expect(chapter.items[0]?.situation).toBe("剛脫離追逐");
  });

  it("parses chapter section and key aliases", () => {
    const text = [
      "標題：章節測試",
      "章節目錄",
      "1. 開端",
      "2. 轉折",
      "環境資訊：學校頂樓",
      "情境：告白前夕",
      "",
      "#C 小雨",
      "台詞",
    ].join("\n");

    const result = extractMetadata(text);
    expect(result.metadata.Title).toBe("章節測試");
    const chapter = JSON.parse(result.metadata.ChapterSettings);
    expect(chapter.mode).toBe("chapter_multi");
    expect(chapter.items).toEqual([
      { chapter: "1. 開端", environment: "學校頂樓", situation: "告白前夕" },
      { chapter: "2. 轉折", environment: "", situation: "" },
    ]);
  });

  it("keeps tags scoped and does not swallow numbered character sections", () => {
    const text = [
      "作品資訊",
      "標題",
      "面臨雙子姊妹的戀愛選擇題",
      "適合標籤",
      "ASMR、年下、療癒、掏耳朵、日常/生活、雙胞胎",
      "人物設定1",
      "基本資料",
      "郁萱，雙胞胎中的姐姐，高中生，17歲。",
      "標記說明",
    ].join("\n");

    const result = extractMetadata(text);
    expect(result.metadata.Title).toBe("面臨雙子姊妹的戀愛選擇題");
    expect(result.metadata.Tags).toBe("ASMR、年下、療癒、掏耳朵、日常/生活、雙胞胎");
    expect(result.metadata.Tags).not.toContain("人物設定1");
  });
});
