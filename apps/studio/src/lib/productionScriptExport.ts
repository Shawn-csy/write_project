import {
  buildFlexiblePattern,
  defaultMarkerConfigs,
  normalizeMarkerConfigsSchema,
  parseInline,
  parseScreenplay,
  type AstNode,
  type MarkerConfig,
} from "@write/script-engine";
import { customMetadataEntriesToMeta } from "./customMetadata";
import { buildExportMetadata, type ExportMetadataSource } from "./exportMetadata";

type DetailRow = [label: string, value: string];
type WordRun = { text: string; style?: ProductionWordStyle };
type ScriptRow = { label: string; text: string; kind: "speech" | "cue" | "position" | "pause"; style?: ProductionWordStyle; labelStyle?: ProductionWordStyle; runs?: WordRun[]; cueTarget?: "continuousEffect" | "background" };
type Chapter = { heading: string; details: DetailRow[]; rows: ScriptRow[]; style?: ProductionWordStyle };

export const PRODUCTION_MARKER_TARGETS = [
  "preserve", "chapter", "speaker", "dialogue", "pause", "position",
  "effect", "continuousEffect", "background", "performance", "postEffect",
] as const;

export type ProductionMarkerTarget = typeof PRODUCTION_MARKER_TARGETS[number];
export type ProductionMarkerMapping = Partial<Record<string, ProductionMarkerTarget>>;
export interface ProductionWordStyle {
  color?: string;
  font?: string;
  bold?: boolean;
}

export interface ProductionWordRule {
  target?: ProductionMarkerTarget | "auto";
  symbol?: string;
  style?: ProductionWordStyle;
}

export function readProductionWordRule(config: { productionWord?: unknown } | Record<string, unknown> | undefined): ProductionWordRule {
  const rule = config?.productionWord as ProductionWordRule | undefined;
  if (!rule || typeof rule !== "object") return {};
  const { target, symbol, style } = rule;
  const safeStyle = {
    color: typeof style?.color === "string" && /^#[0-9a-f]{6}$/i.test(style.color) ? style.color : undefined,
    font: typeof style?.font === "string" ? style.font.trim().slice(0, 100) || undefined : undefined,
    bold: typeof style?.bold === "boolean" ? style.bold : undefined,
  };
  return {
    target: (target === "auto" || (target && PRODUCTION_MARKER_TARGETS.includes(target))) ? target : undefined,
    symbol: typeof symbol === "string" ? symbol.trim().slice(0, 100) || undefined : undefined,
    style: Object.values(safeStyle).some((value) => value !== undefined) ? safeStyle : undefined,
  };
}

export type ProductionMarkerSyntax = Partial<Pick<MarkerConfig, "id" | "parseAs" | "matchMode" | "start" | "pause" | "end" | "isBlock" | "type">> & {
  v2TrackId?: unknown;
  v2EventKind?: unknown;
};

export function inferProductionMarkerOutput(rule: ProductionMarkerSyntax): Pick<ProductionWordRule, "target" | "symbol"> {
  if (rule.parseAs === "scene_heading") return { target: "chapter" };
  if (rule.parseAs === "character") return { target: "speaker" };
  if (rule.parseAs === "dialogue") return { target: "dialogue" };
  if (rule.id === "rule-position" || rule.start === "@") return { target: "position" };
  if (rule.matchMode === "range") return { symbol: [rule.start, rule.pause, rule.end].filter(Boolean).join(" … ") };
  if (rule.matchMode === "prefix" && rule.start && (
    rule.isBlock || rule.type === "block" || rule.v2TrackId === "sfx" || ["sfx", "bgm"].includes(String(rule.v2EventKind))
  )) return { symbol: rule.start };
  if (rule.matchMode === "enclosure" && (rule.isBlock || rule.type === "block")) return {};
  return { target: "preserve" };
}

export function loadProductionMarkerMapping(configs: unknown): ProductionMarkerMapping {
  const rules = normalizeMarkerConfigsSchema(configs).filter((rule) =>
    rule.id && rule.matchMode !== "virtual" && (rule.start || rule.regex),
  );
  const storageKey = `production-script-mapping:${JSON.stringify(rules.map((rule) => rule.id).sort())}`;
  let saved: ProductionMarkerMapping = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") || {};
  } catch {
    // Themes and inferred rules still work when browser storage is unavailable.
  }
  return Object.fromEntries(rules.flatMap((rule) => {
    const target = readProductionWordRule(rule).target ?? saved[rule.id];
    return target && target !== "auto" && PRODUCTION_MARKER_TARGETS.includes(target) ? [[rule.id, target]] : [];
  }));
}

type ResolvedWordRule = ProductionWordRule & { matchMode?: string };
type ProductionTargetMap = ReadonlyMap<string, ResolvedWordRule>;

const RANGE_SYMBOLS = {
  continuousEffect: { start: ">>SE", pause: "><SE", end: "<<SE" },
  background: { start: "//BG", pause: "/\\BG", end: "\\\\BG" },
};

export interface ProductionScriptExport {
  title: string;
  author: string;
  rating: string;
  work: DetailRow[];
  characters: DetailRow[];
  chapters: Chapter[];
}

const value = (input: unknown) => String(input ?? "").trim();
const chapterKeys = (heading: string) => {
  const normalized = heading.normalize("NFKC").trim().toLowerCase();
  const match = /^(\d{1,3})[.、]\s*(.*)$/.exec(normalized);
  if (match) return [normalized, String(Number(match[1])), match[2]];
  return /^\d+$/.test(normalized) ? [String(Number(normalized))] : [normalized];
};

function readChapterDetails(raw: string | undefined) {
  try {
    const parsed = JSON.parse(raw || "");
    if (parsed?.mode === "chapter_multi" && Array.isArray(parsed.items)) {
      return parsed.items.map((item: { chapter?: unknown; situation?: unknown; environment?: unknown } | null) => ({
        heading: value(item?.chapter),
        details: [
          ["狀況", value(item?.situation)],
          ["環境", value(item?.environment)],
        ].filter((row): row is DetailRow => Boolean(row[1])),
      })) as Array<{ heading: string; details: DetailRow[] }>;
    }
  } catch {
    // Older scripts can have a plain-text chapter setting.
  }
  return null;
}

function flattenBody(root: AstNode): AstNode[] {
  const body: AstNode[] = [];
  const pending = [root];
  while (pending.length) {
    const node = pending.pop()!;
    if (node.type !== "root" && node.type !== "range") body.push(node);
    if (node.endNode) pending.push(node.endNode);
    for (const child of [...(node.children ?? [])].reverse()) pending.push(child);
    if (node.startNode) pending.push(node.startNode);
  }
  return body.sort((a, b) => (a.lineStart ?? 0) - (b.lineStart ?? 0));
}

function cueRow(node: AstNode, config: MarkerConfig | undefined): ScriptRow | undefined {
  const kind = config?.id === "rule-position" || config?.start === "@" ? "position" : "cue";
  if (node.type === "layer" || node.rangeRole) {
    const symbol = node.rangeRole === "end" ? config?.end
      : node.rangeRole === "pause" ? config?.pause : config?.start;
    return { label: symbol || config?.label || node.label || "", text: node.text ?? "", kind };
  }
  // The default standalone #SE is parsed as an inline marker on an action.
  // Promote only an actual leading cue, leaving inline effects inside dialogue.
  const first = node.inline?.[0];
  if (node.type === "action" && first?.type === "highlight" && first.id === config?.id &&
      config?.matchMode === "prefix" && config.start &&
      (config.v2TrackId === "sfx" || ["sfx", "bgm"].includes(String(config.v2EventKind)))) {
    const text = node.text ?? "";
    const prefix = new RegExp(`^${buildFlexiblePattern(config.start)}`).exec(text)?.[0];
    if (prefix) return { label: config.start, text: text.slice(prefix.length).trim(), kind };
  }
  return undefined;
}

function mapInline(tokens: ReturnType<typeof parseInline>, mapping: ProductionTargetMap): WordRun[] {
  return tokens.map((token, index) => {
    const rule = token.id ? mapping.get(token.id) : undefined;
    if (rule?.matchMode === "prefix" && index > 0) return { text: token.raw ?? token.content };
    let text = token.raw ?? token.content;
    if (rule?.target && rule.target !== "auto" && rule.target !== "preserve") {
      if (rule.symbol) text = [rule.symbol, token.content].filter(Boolean).join(" ");
      else if (rule.target === "pause") text = `（停頓 ${token.content}）`;
      else if (rule.target === "performance") text = `（${token.content}）`;
      else if (rule.target === "postEffect") text = `【${token.content}】`;
      else if (rule.target === "position" || rule.target === "effect") {
        text = [rule.target === "position" ? "@" : "#SE", token.content].filter(Boolean).join(" ");
      }
    }
    return rule?.style ? { text, style: rule.style } : { text };
  });
}

function inlineProjection(tokens: ReturnType<typeof parseInline>, mapping: ProductionTargetMap) {
  const runs = mapInline(tokens, mapping);
  return {
    text: runs.map((run) => run.text).join(""),
    runs: runs.some((run) => run.style) ? runs : undefined,
  };
}

type WordNode = AstNode & { cue?: ScriptRow; wordStyle?: ProductionWordStyle; wordRuns?: WordRun[] };

function mappedNode(node: AstNode, target: ProductionMarkerTarget, text: string, config?: MarkerConfig, symbol?: string): WordNode {
  const withSymbol = symbol ? [symbol, text].filter(Boolean).join(" ") : undefined;
  switch (target) {
    case "preserve":
      return { ...node, type: "action", text: node.raw ?? node.text };
    case "chapter":
      return text ? { ...node, type: "scene_heading", text: withSymbol ?? text } : { ...node, type: "action", text: node.raw };
    case "speaker":
      return { ...node, type: "character", text: withSymbol || text || config?.label || node.raw };
    case "dialogue":
      return { ...node, type: "dialogue", text: withSymbol ?? text };
    case "pause":
      return { ...node, cue: { label: "", text: withSymbol ?? (text ? `（停頓 ${text}）` : ""), kind: "pause" } };
    case "position":
      return { ...node, cue: { label: symbol ?? "@", text, kind: "position" } };
    case "effect":
      return { ...node, cue: { label: symbol ?? "#SE", text, kind: "cue" } };
    case "continuousEffect":
    case "background":
      return { ...node, cue: { label: symbol ?? RANGE_SYMBOLS[target][node.rangeRole || "start"], text, kind: "cue", ...(symbol ? { cueTarget: target } : {}) } };
    case "performance":
      return { ...node, type: "action", text: withSymbol ?? `（${text}）` };
    case "postEffect":
      return { ...node, type: "action", text: withSymbol ?? `【${text}】` };
  }
}

function projectNode(
  node: AstNode,
  configs: MarkerConfig[],
  rulesById: Map<string, MarkerConfig>,
  mapping: ProductionTargetMap,
): WordNode {
  const blockId = node.markerId || node.layerType;
  const blockRule = blockId ? rulesById.get(blockId) : undefined;
  const word = blockId ? mapping.get(blockId) : undefined;
  const target = word?.target === "auto" ? undefined : word?.target;
  if (target === "preserve") return { ...mappedNode(node, target, ""), wordStyle: word?.style };

  const source = node.text ?? "";
  const spans = mapping.size ? parseInline(source, configs, { preserveDelimiters: true }) : [];
  const inlineRule = node.type === "action" && spans[0]?.id ? rulesById.get(spans[0].id) : undefined;
  const inlineWord = inlineRule ? mapping.get(inlineRule.id) : undefined;
  const inlineTarget = inlineWord?.target;
  if (!blockRule && spans.length === 1 && inlineRule && inlineTarget && inlineTarget !== "auto" && inlineTarget !== "preserve") {
    return { ...mappedNode(node, inlineTarget, spans[0].content, inlineRule, inlineWord?.symbol), wordStyle: inlineWord?.style };
  }

  const inline = mapping.size && node.text !== undefined ? inlineProjection(spans, mapping) : undefined;
  const text = inline?.text ?? node.text;
  const wordRuns = inline?.runs;
  if (target) {
    const mapped = mappedNode(node, target, text ?? "", blockRule, word?.symbol);
    const result = mapped.cue?.text ?? mapped.text;
    const contentIndex = text && result ? result.indexOf(text) : -1;
    const runs = wordRuns && result && text && contentIndex >= 0 ? [
      { text: result.slice(0, contentIndex) },
      ...wordRuns,
      { text: result.slice(contentIndex + text.length) },
    ].filter((run) => run.text) : undefined;
    return { ...mapped, wordStyle: word?.style, wordRuns: runs };
  }
  if (inlineTarget === "preserve") return { ...node, text, wordRuns };
  const cue = cueRow(node, blockRule || rulesById.get(node.inline?.[0]?.id || ""));
  if (!cue) return { ...node, text, wordStyle: word?.style, wordRuns };
  const cueInline = !blockRule && mapping.size
    ? inlineProjection(parseInline(cue.text, configs, { preserveDelimiters: true }), mapping)
    : inline;
  return {
    ...node, text, wordStyle: word?.style ?? inlineWord?.style, wordRuns: cueInline?.runs,
    cue: { ...cue, label: word?.symbol ?? inlineWord?.symbol ?? cue.label, text: cueInline?.text ?? cue.text },
  };
}

export function buildProductionScriptExport(
  content: string,
  source: ExportMetadataSource,
  markerConfigs: MarkerConfig[] = defaultMarkerConfigs,
  mapping?: ProductionMarkerMapping,
): ProductionScriptExport {
  const configs = normalizeMarkerConfigsSchema(markerConfigs);
  const rulesById = new Map(configs.map((config) => [config.id, config]));
  const { ast, titleEntries } = parseScreenplay(content.replace(/\r\n?/g, "\n").replace(/\n$/, ""), configs);
  const titleFields = titleEntries.map(({ key, values }) => ({ key, value: values.join("\n") }));
  const customMetadata = [...titleFields, ...(source.customMetadata ?? [])];
  const rawMeta = customMetadataEntriesToMeta(customMetadata);
  const tags = source.tags?.length ? source.tags : (rawMeta.tags || rawMeta["適合標籤"] || "").split(/[,，、]/);
  const ratingTag = tags.map((tag) => value(typeof tag === "string" ? tag : tag.name))
    .find((tag) => ["全年齡", "全年齡向", "成人向"].includes(tag));
  const metadata = buildExportMetadata({
    ...source,
    synopsis: source.synopsis || rawMeta["作品描述"],
    author: source.author || rawMeta["台本師"],
    tags,
    customMetadata,
  });
  const fields = new Map(metadata.fields.map((field) => [field.key, field]));
  const chapterSettings = fields.get("chapterSettings");
  const details = readChapterDetails(chapterSettings?.rawValue);
  const work: DetailRow[] = [];
  const characters: DetailRow[] = [];
  const labels = { synopsis: "作品描述", tags: "適合標籤", roleSetting: "基本資料" };
  for (const field of metadata.fields) {
    if (["title", "author", "audience", "chapterSettings"].includes(field.key) ||
        (field.key === "customField" && ["tags", "適合標籤", "作品描述", "台本師", "分級"].includes(field.label.toLowerCase()))) continue;
    const section = ["roleSetting", "performanceInstruction"].includes(field.key) ||
      ["基本資料", "性格", "外表"].includes(field.label) ? characters : work;
    section.push([labels[field.key as keyof typeof labels] || field.label, field.value]);
  }
  if (chapterSettings && !details) work.push([chapterSettings.label, chapterSettings.value]);

  const chapters: Chapter[] = [];
  let chapter: Chapter = { heading: "", details: [], rows: [] };
  let speaker = "";
  let speakerStyle: ProductionWordStyle | undefined;
  const flushSpeaker = () => {
    if (speaker) chapter.rows.push({ label: speaker, text: "", kind: "speech", ...(speakerStyle ? { labelStyle: speakerStyle } : {}) });
    speaker = "";
    speakerStyle = undefined;
  };
  const targets = new Map<string, ResolvedWordRule>();
  for (const rule of configs) {
    const { target, style, symbol } = readProductionWordRule(rule);
    const effectiveTarget = mapping ? mapping[rule.id] : target;
    const effectiveSymbol = effectiveTarget && effectiveTarget !== "auto" && effectiveTarget !== "preserve" ? symbol : undefined;
    if ((effectiveTarget && effectiveTarget !== "auto") || style) {
      targets.set(rule.id, { target: effectiveTarget, style, symbol: effectiveSymbol, matchMode: rule.matchMode });
    }
  }
  for (const sourceNode of flattenBody(ast)) {
    const node = projectNode(sourceNode, configs, rulesById, targets);
    if (node.cue) {
      flushSpeaker();
      chapter.rows.push({
        ...node.cue,
        ...(node.wordStyle ? { style: node.wordStyle } : {}),
        ...(node.wordRuns ? { runs: node.wordRuns } : {}),
      });
    } else if (node.type === "character") {
      flushSpeaker();
      speaker = node.text ?? "";
      speakerStyle = node.wordStyle;
    } else if (node.type === "scene_heading") {
      flushSpeaker();
      if (chapter.heading || chapter.rows.some((row) => row.kind !== "pause" || row.text)) chapters.push(chapter);
      const heading = node.text ?? "";
      const keys = chapterKeys(heading);
      const index = details?.findIndex((item) => item.heading &&
        chapterKeys(item.heading).some((key) => keys.includes(key))) ?? -1;
      const matched = index >= 0 ? details?.splice(index, 1)[0] : undefined;
      chapter = { heading, details: matched?.details ?? [], rows: [], ...(node.wordStyle ? { style: node.wordStyle } : {}) };
    } else if (node.type === "blank") {
      flushSpeaker();
      chapter.rows.push({ label: "", text: "", kind: "pause" });
    } else {
      chapter.rows.push({
        label: speaker, text: node.text ?? node.raw ?? "", kind: "speech",
        ...(node.wordStyle ? { style: node.wordStyle } : {}),
        ...(speaker && (speakerStyle || node.wordStyle) ? { labelStyle: speakerStyle ?? {} } : {}),
        ...(node.wordRuns ? { runs: node.wordRuns } : {}),
      });
      speaker = "";
      speakerStyle = undefined;
    }
  }
  flushSpeaker();
  if (chapter.heading || chapter.rows.some((row) => row.kind !== "pause" || row.text)) chapters.push(chapter);

  // Keep metadata for chapters whose names do not match any AST heading.
  for (const item of details ?? []) {
    for (const [label, text] of item.details) {
      work.push([item.heading ? `${item.heading} ${label}` : label, text]);
    }
  }
  return {
    title: metadata.title,
    author: fields.get("author")?.value ?? "",
    rating: value(source.contentRating || rawMeta.contentrating || rawMeta["內容分級"] || rawMeta["分級"] || ratingTag),
    work,
    characters,
    chapters,
  };
}
