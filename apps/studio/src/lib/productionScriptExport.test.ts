import { describe, expect, it } from "vitest";
import { buildProductionScriptExport, loadProductionMarkerMapping } from "./productionScriptExport";

describe("production script marker mapping", () => {
  it("maps custom block, inline and range syntax without changing neighboring text", () => {
    const content = [
      "<t>Inside.套房.Night",
      "/sfx 遊戲背景聲",
      "/p2",
      "/d中距離，右邊",
      "<cs>風聲＜5 秒＞",
      "/*疲憊*/打完了。|混響|",
      "</cs>結束",
      "/skip 記住這句",
      "台詞裡出現 /p2，保留原文。",
    ].join("\n");
    const rules = [
      { id: "scene", start: "<t>", matchMode: "prefix", isBlock: true },
      { id: "pause", start: "/p", matchMode: "prefix" },
      { id: "direction", start: "/d", matchMode: "prefix" },
      { id: "sfx", start: "/sfx", matchMode: "prefix", v2TrackId: "sfx" },
      { id: "sustain", start: "<cs>", end: "</cs>", matchMode: "range" },
      { id: "voice", start: "/*", end: "*/", matchMode: "enclosure" },
      { id: "edit", start: "|", end: "|", matchMode: "enclosure" },
      { id: "skip", start: "/skip", matchMode: "prefix", isBlock: true },
    ];
    const original = buildProductionScriptExport(content, { title: "T" }, rules);
    const converted = buildProductionScriptExport(content, { title: "T" }, rules, {
      scene: "chapter",
      pause: "pause",
      direction: "position",
      sfx: "effect",
      sustain: "continuousEffect",
      voice: "performance",
      edit: "postEffect",
      skip: "preserve",
    });

    expect(original.chapters[0].heading).toBe("");
    expect(converted.chapters).toEqual([{
      heading: "Inside.套房.Night",
      details: [],
      rows: [
        { label: "#SE", text: "遊戲背景聲", kind: "cue" },
        { label: "", text: "（停頓 2）", kind: "pause" },
        { label: "@", text: "中距離，右邊", kind: "position" },
        { label: ">>SE", text: "風聲＜5 秒＞", kind: "cue" },
        { label: "", text: "（疲憊）打完了。【混響】", kind: "speech" },
        { label: "<<SE", text: "結束", kind: "cue" },
        { label: "", text: "/skip 記住這句", kind: "speech" },
        { label: "", text: "台詞裡出現 /p2，保留原文。", kind: "speech" },
      ],
    }]);
  });
  it("uses saved theme output by default, with separate style for speakers and inline spans", () => {
    const rules = [
      { id: "scene", start: "^", matchMode: "prefix", isBlock: true, productionWord: {
        target: "chapter", style: { bold: true },
      } },
      { id: "speaker", start: "#C", matchMode: "prefix", isBlock: true, productionWord: {
        target: "speaker", style: { color: "#882222" },
      } },
      { id: "dialogue", start: "#D", matchMode: "prefix", isBlock: true, productionWord: {
        target: "dialogue", style: { bold: false },
      } },
      { id: "tone", start: "(", end: ")", matchMode: "enclosure", productionWord: {
        target: "performance", style: { font: "Noto Sans TC" },
      } },
      { id: "fx", start: "<fx>", end: "</fx>", matchMode: "range", productionWord: {
        target: "continuousEffect", symbol: "FX", style: { bold: true },
      } },
    ];

    const mapping = loadProductionMarkerMapping(rules);
    expect(mapping).toMatchObject({ scene: "chapter", speaker: "speaker", dialogue: "dialogue", tone: "performance" });
    const content = "^ 開場\n#C 小雨\n#D 小心(低聲)喔。\n<fx>風聲\n</fx>";
    const result = buildProductionScriptExport(content, { title: "T" }, rules);
    expect(result.chapters[0]).toMatchObject({
      heading: "開場", style: { bold: true },
      rows: [
        {
          label: "小雨",
          labelStyle: { color: "#882222" },
          text: "小心（低聲）喔。",
          style: { bold: false },
          runs: [{ text: "小心" }, { text: "（低聲）", style: { font: "Noto Sans TC" } }, { text: "喔。" }],
        },
        { label: "FX", cueTarget: "continuousEffect", text: "風聲" },
        { label: "FX", cueTarget: "continuousEffect" },
      ],
    });
    const override = buildProductionScriptExport(content, { title: "T" }, rules, { ...mapping, scene: "preserve" });
    expect(override.chapters[0].heading).toBe("");
    expect(override.chapters[0].rows[0].text).toBe("^ 開場");
  });

  it("keeps previous browser mappings for older rules and respects an explicit theme reset", () => {
    const rules = [
      { id: "a", start: "#A", productionWord: { target: "auto" } },
      { id: "b", start: "#B", productionWord: { target: "speaker" } },
      { id: "c", start: "#C" },
    ];
    const key = 'production-script-mapping:["a","b","c"]';
    localStorage.setItem(key, JSON.stringify({ a: "chapter", b: "effect", c: "dialogue" }));
    try {
      expect(loadProductionMarkerMapping(rules)).toEqual({ b: "speaker", c: "dialogue" });
    } finally {
      localStorage.removeItem(key);
    }
  });

});
