const START_SECTION_RE = /^\s*(?:【\s*)?(標記說明|標記規則|語法規則|使用規章|Markers?|Marker\s*Guide)(?:\s*】)?\s*[:：]?\s*$/i;
const END_SECTION_RE = /^\s*(?:【\s*)?(章節目錄|劇情開始|正文|內文|角色設定|人物設定|作品介紹|故事背景)(?:\s*】)?\s*[:：]?\s*$/i;
const SCENE_OR_CHAPTER_RE = /^\s*(?:\d+\.\s+.+|Chapter\s+\d+|INT\.|EXT\.)/i;

export function stripMarkerGuideBlocks(text = "") {
  const lines = String(text || "").split("\n");
  const out = [];
  let inGuide = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = String(raw || "").trim();

    if (!inGuide && START_SECTION_RE.test(trimmed)) {
      inGuide = true;
      continue;
    }

    if (inGuide) {
      if (END_SECTION_RE.test(trimmed) || SCENE_OR_CHAPTER_RE.test(trimmed)) {
        inGuide = false;
        out.push(raw);
      }
      continue;
    }

    out.push(raw);
  }

  return out.join("\n").replace(/^\n+/, "").trimStart();
}

