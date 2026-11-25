/**
 * Some summaries are not summaries: imported scripts with no blurb carry the head of the
 * script document instead ("作品資訊 台本師 … 作品描述 … 人物設定 …"). Cards should show the
 * 作品描述 part of that, or nothing — never the metadata dump.
 */
const AFTER_DESCRIPTION = ["適合標籤", "人物設定", "基本資料", "演繹指示", "標記說明"];

export function cleanScriptSummary(value: string | null | undefined): string {
  const original = String(value || "");
  const flat = original.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const looksLikeDocumentHead = /(^|\s)作品資訊([\s：:]|$)/.test(flat.slice(0, 80));
  if (!looksLikeDocumentHead) return original;
  const start = flat.indexOf("作品描述");
  if (start < 0) return "";
  const rest = flat.slice(start + "作品描述".length).replace(/^[\s:：]+/, "");
  const ends = AFTER_DESCRIPTION.map((head) => rest.indexOf(head)).filter((index) => index >= 0);
  return (ends.length ? rest.slice(0, Math.min(...ends)) : rest).replace(/[…\s]+$/, "").trim();
}
