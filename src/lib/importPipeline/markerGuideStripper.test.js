import { describe, expect, it } from "vitest";
import { stripMarkerGuideBlocks } from "./markerGuideStripper.js";

describe("stripMarkerGuideBlocks", () => {
  it("removes marker guide section and keeps chapter content", () => {
    const input = [
      "標記說明",
      "#C 角色名：角色行",
      "#SE 音效：單行音效",
      "章節目錄",
      "1. 第一章",
      "正文內容"
    ].join("\n");

    const out = stripMarkerGuideBlocks(input);
    expect(out).not.toContain("標記說明");
    expect(out).not.toContain("#C 角色名：角色行");
    expect(out).toContain("章節目錄");
    expect(out).toContain("1. 第一章");
  });

  it("supports bracket heading and stops at scene heading", () => {
    const input = [
      "【標記規則】",
      "((內容)) 段落註記",
      "@位置",
      "INT. ROOM - DAY",
      "ACTION"
    ].join("\n");
    const out = stripMarkerGuideBlocks(input);
    expect(out).not.toContain("標記規則");
    expect(out).toContain("INT. ROOM - DAY");
    expect(out).toContain("ACTION");
  });
});

