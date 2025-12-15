import assert from "node:assert/strict";
import {
  preprocessRawScript,
  splitTitleAndBody,
  extractTitleEntries,
  buildSceneListFromTokens,
} from "../src/lib/screenplayParser.js";
import {
  BLANK_LONG,
  BLANK_MID,
  BLANK_SHORT,
  BLANK_PURE,
  DIR_TOKEN,
  SFX_TOKEN,
} from "../src/lib/screenplayTokens.js";

const sample = `Title: Demo
Tag: foo

INT. ROOM - DAY
[SFX: 風聲]
[遠方左側]
短留白
中留白
長留白
留白`;

const tokens = [
  { type: "scene_heading", text: "INT. ROOM - DAY" },
  { type: "scene_heading", text: "INT. ROOM - DAY" },
];

const expectedSceneIds = ["int-room-day", "int-room-day-2"];

const preprocessed = preprocessRawScript(sample);

assert.ok(preprocessed.includes(`${SFX_TOKEN}風聲`), "應將 SFX 括號轉為 SFX token");
assert.ok(preprocessed.includes(`${DIR_TOKEN}遠方左側`), "應將方向括號轉為 DIR token");
assert.ok(preprocessed.includes(BLANK_SHORT), "短留白替換");
assert.ok(preprocessed.includes(BLANK_MID), "中留白替換");
assert.ok(preprocessed.includes(BLANK_LONG), "長留白替換");
assert.ok(preprocessed.includes(BLANK_PURE), "純留白替換");

const { titleLines, bodyText } = splitTitleAndBody(preprocessed);
assert.equal(titleLines[0], "Title: Demo", "應分離標題區");
assert.ok(bodyText.includes("INT. ROOM - DAY"), "正文應包含場景");

const entries = extractTitleEntries(titleLines);
assert.equal(entries[0].key, "Title", "標題 key 應解析");
assert.equal(entries[1].key, "Tag", "Tag key 應解析");
assert.equal(entries[1].values[0], "foo", "Tag 值應解析");

const scenes = buildSceneListFromTokens(tokens);
assert.deepEqual(
  scenes.map((s) => s.id),
  expectedSceneIds,
  "重複場景應生成唯一 slug"
);
