/**
 * Transforms a raw PublicScript API response into the props shape
 * expected by PublicScriptInfoOverlay.
 *
 * Mirrors src/lib/publicReaderProjection.ts logic without the Vite deps.
 */
import {
  buildPublicPrefaceItems,
  isPublicMetadataSystemKey,
  normalizePublicMetadataKey,
} from "@write/reader-export";
import type { PublicPrefaceItem } from "@write/reader-export";
import type { PublicScript } from "./types";

interface DemoLinkItem {
  id?: string;
  name?: string;
  url: string;
  cast?: string;
  description?: string;
}

function buildPrefaceItems(script: PublicScript): PublicPrefaceItem[] {
  const meta: Record<string, string> = {};
  for (const entry of script.customMetadata ?? []) {
    const key = normalizePublicMetadataKey(entry.key);
    const value = String(entry.value ?? "").trim();
    if (key && value && meta[key] === undefined) meta[key] = value;
  }
  return buildPublicPrefaceItems(meta, { outline: script.outline });
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
  prefaceItems: PublicPrefaceItem[];
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

  // licenseSpecialTerms from canonical field
  let licenseSpecialTerms: string[] = [];
  const canonicalTerms = String(script.licenseSpecialTerms ?? "").trim();
  if (canonicalTerms) {
    try {
      const parsed = JSON.parse(canonicalTerms);
      licenseSpecialTerms = Array.isArray(parsed)
        ? normalizeLicenseSpecialTerms(parsed)
        : [canonicalTerms];
    } catch {
      licenseSpecialTerms = [canonicalTerms];
    }
  }

  return {
    prefaceItems: buildPrefaceItems(script),
    demoLinks: parseDemoLinks(script.activityDemoLinks),
    commercialUse: String(script.licenseCommercial ?? "").trim(),
    derivativeUse: String(script.licenseDerivative ?? "").trim(),
    notifyOnModify: String(script.licenseNotify ?? "").trim(),
    licenseSpecialTerms,
    targetAudience: String(script.targetAudience ?? "").trim(),
    contentRating: String(script.contentRating ?? "").trim(),
    license: String(script.license ?? "").trim(),
    customFields: customMeta
      .map((e) => ({ key: String(e.key ?? "").trim(), value: String(e.value ?? "").trim() }))
      .filter((e) => e.key && e.value && !isPublicMetadataSystemKey(e.key)),
  };
}
