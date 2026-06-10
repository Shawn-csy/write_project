/**
 * Transforms a raw PublicScript API response into the props shape
 * expected by PublicScriptInfoOverlay.
 *
 * Mirrors src/lib/publicReaderProjection.ts logic without the Vite deps.
 */
import type { PublicScript } from "./types";

interface PrefaceItem {
  id?: string;
  title?: string;
  value?: string;
  [key: string]: unknown;
}

interface DemoLinkItem {
  id?: string;
  name?: string;
  url: string;
  cast?: string;
  description?: string;
}

const normalizePrefaceKey = (key = "") =>
  String(key || "").trim().toLowerCase().replace(/\s+/g, "");

const PREFACE_RULES: Array<{ id: string; title: string; keys: string[] }> = [
  { id: "outline", title: "大綱", keys: ["outline", "大綱"] },
  { id: "rolesetting", title: "角色設定", keys: ["rolesetting", "角色設定"] },
  { id: "backgroundinfo", title: "背景資訊", keys: ["backgroundinfo", "背景資訊"] },
  { id: "performanceinstruction", title: "演繹指示", keys: ["performanceinstruction", "演繹指示"] },
  { id: "openingintro", title: "作品的開頭引言", keys: ["openingintro", "作品的開頭引言"] },
  { id: "chaptersettings", title: "章節", keys: ["chaptersettings"] },
].map((rule) => ({ ...rule, keys: rule.keys.map(normalizePrefaceKey) }));

function buildPrefaceItems(script: PublicScript): Array<PrefaceItem> {
  const valueByKey = new Map<string, string>();

  // Top-level outline field
  if (script.outline) {
    valueByKey.set("outline", String(script.outline).trim());
  }

  // customMetadata entries (key/value pairs)
  for (const entry of script.customMetadata ?? []) {
    const k = normalizePrefaceKey(String(entry.key ?? ""));
    const v = String(entry.value ?? "").trim();
    if (k && v && !valueByKey.has(k)) valueByKey.set(k, v);
  }

  const items: PrefaceItem[] = [];
  const seen = new Set<string>();
  for (const rule of PREFACE_RULES) {
    const matchedKey = rule.keys.find((k) => valueByKey.has(k));
    if (!matchedKey) continue;
    const value = valueByKey.get(matchedKey)!;
    const sig = `${rule.id}::${value}`;
    if (!value || seen.has(sig)) continue;
    seen.add(sig);
    items.push({ id: rule.id, title: rule.title, value });
  }
  return items;
}

function parseDemoLinks(raw: string | null | undefined): DemoLinkItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item === "object" && item.url);
  } catch {
    return [];
  }
}

function normalizeLicenseSpecialTerms(raw: unknown[]): string[] {
  return raw
    .map((item) =>
      String((item as { text?: string } | null)?.text ?? item ?? "").trim()
    )
    .filter(Boolean);
}

export interface ScriptOverlayProps {
  prefaceItems: PrefaceItem[];
  demoLinks: DemoLinkItem[];
  commercialUse: string;
  derivativeUse: string;
  notifyOnModify: string;
  licenseSpecialTerms: string[];
  targetAudience: string;
  contentRating: string;
  customFields: Array<{ key: string; value: string }>;
  license: string;
}

export function buildScriptOverlayProps(script: PublicScript): ScriptOverlayProps {
  const customMeta = script.customMetadata ?? [];

  // Extract targetAudience, contentRating, license from customMetadata
  const metaByKey = new Map<string, string>();
  for (const entry of customMeta) {
    const k = normalizePrefaceKey(String(entry.key ?? ""));
    const v = String(entry.value ?? "").trim();
    if (k && v) metaByKey.set(k, v);
  }

  // licenseSpecialTerms — may be a custom metadata entry or persona field
  const rawTerms = customMeta
    .filter((e) => normalizePrefaceKey(String(e.key ?? "")) === "licensespecialterms")
    .map((e) => String(e.value ?? "").trim())
    .filter(Boolean);

  let licenseSpecialTerms: string[] = rawTerms;
  if (rawTerms.length === 1) {
    try {
      const parsed = JSON.parse(rawTerms[0]);
      if (Array.isArray(parsed)) {
        licenseSpecialTerms = normalizeLicenseSpecialTerms(parsed);
      }
    } catch {
      // not JSON, use as-is
    }
  }

  return {
    prefaceItems: buildPrefaceItems(script),
    demoLinks: parseDemoLinks(script.activityDemoLinks),
    commercialUse: String(script.licenseCommercial ?? "").trim(),
    derivativeUse: String(script.licenseDerivative ?? "").trim(),
    notifyOnModify: String(script.licenseNotify ?? "").trim(),
    licenseSpecialTerms,
    targetAudience: metaByKey.get("targetaudience") ?? metaByKey.get("觀眾取向") ?? "",
    contentRating: metaByKey.get("contentrating") ?? metaByKey.get("內容分級") ?? "",
    license: metaByKey.get("license") ?? metaByKey.get("授權") ?? "",
    customFields: customMeta
      .map((e) => ({ key: String(e.key ?? "").trim(), value: String(e.value ?? "").trim() }))
      .filter((e) => e.key && e.value),
  };
}
