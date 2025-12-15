import assert from "node:assert/strict";
import { buildPrintHtml } from "../src/lib/print.js";
import {
  BLANK_SHORT,
  DIR_TOKEN,
  SFX_TOKEN,
} from "../src/lib/screenplayTokens.js";

const html = buildPrintHtml({
  titleName: "Demo",
  activeFile: "demo.fountain",
  titleHtml: "",
  rawScriptHtml: `
    <p>${SFX_TOKEN}風吹</p>
    <p>${DIR_TOKEN}遠方</p>
    <p>${BLANK_SHORT}</p>
  `,
  accent: "160 84% 39%",
  accentForeground: "160 90% 12%",
  accentMuted: "160 30% 90%",
});

assert.ok(html.includes("[SFX: 風吹]"), "PDF 應渲染 SFX 標籤");
assert.ok(html.includes("[遠方]"), "PDF 應渲染方位標籤");
assert.ok(html.includes("whitespace-short"), "PDF 應包含留白區塊");
