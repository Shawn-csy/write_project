import { describe, expect, it } from "vitest";
import { cleanScriptSummary } from "./scriptSummary";

describe("cleanScriptSummary", () => {
  it("leaves an ordinary summary untouched", () => {
    expect(cleanScriptSummary("與寄宿在你家的表妹，\n度過一段日常時光。")).toBe("與寄宿在你家的表妹，\n度過一段日常時光。");
  });

  it("keeps only the 作品描述 part of a document head", () => {
    const head = "起床後小掏耳 作品資訊 台本師 蜘蛛K 分級 一般向 作品描述 假日早晨，與女友的甜蜜掏耳小互動 適合標籤 ASMR、掏耳 人物設定 基本資料 采希";
    expect(cleanScriptSummary(head)).toBe("假日早晨，與女友的甜蜜掏耳小互動");
  });

  it("keeps a description that was cut off before the next heading", () => {
    expect(cleanScriptSummary("標題 作品資訊 台本師 某人 作品描述 平時溫柔的女友，今天卻…")).toBe("平時溫柔的女友，今天卻");
  });

  it("returns nothing when the head has no description", () => {
    expect(cleanScriptSummary("標題 作品資訊 台本師 某人 分級 一般向")).toBe("");
  });

  it("returns nothing for empty input", () => {
    expect(cleanScriptSummary(undefined)).toBe("");
  });
});
