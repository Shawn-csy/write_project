import {
  buildExportMetadata,
  isPublicMetadataSystemKey,
  PUBLIC_PREFACE_FIELD_DEFINITIONS,
  normalizePublicMetadataKey,
} from "@write/reader-export";
import type { ExportMetadata } from "@write/reader-export";
import type { PublicScript } from "./types";

// Keys that are "system keys" in the shared model but have no canonical top-level field on
// PublicScript — they must still flow through to buildExportMetadata via customMetadata.
const SYSTEM_KEYS_PASSTHROUGH = new Set([
  ...PUBLIC_PREFACE_FIELD_DEFINITIONS.flatMap((d) => d.keys).map(normalizePublicMetadataKey),
  "contact", "聯絡方式",
]);

/**
 * Adapts PublicScript to the shared ExportMetadata model used for PDF header generation.
 * Maps Next-specific field names to the shared ExportMetadataSource shape.
 *
 * Strips base system keys (title, license, synopsis, etc.) from customMetadata — these are
 * canonical top-level fields on PublicScript and must not be read from customMetadata.
 * Preface content keys (RoleSetting, BackgroundInfo, etc.) are explicitly preserved so
 * buildExportMetadata can extract and translate them.
 */
export function buildPublicReaderExportMetadata(script: PublicScript): ExportMetadata {
  const filteredMetadata = (script.customMetadata ?? []).filter((entry) => {
    const nk = normalizePublicMetadataKey(entry.key);
    return !isPublicMetadataSystemKey(nk) || SYSTEM_KEYS_PASSTHROUGH.has(nk);
  });

  return buildExportMetadata(
    {
      title: script.title,
      synopsis: script.synopsis,
      outline: script.outline,
      coverUrl: script.coverUrl,
      owner: script.owner,
      persona: script.persona,
      organization: script.organization,
      series: script.series,
      seriesOrder: script.seriesOrder,
      tags: script.tags,
      licenseCommercial: script.licenseCommercial,
      licenseDerivative: script.licenseDerivative,
      licenseNotify: script.licenseNotify,
      licenseSpecialTerms: (() => {
        const raw = script.licenseSpecialTerms;
        if (!raw) return undefined;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return [raw];
      })(),
      targetAudience: script.targetAudience,
      contentRating: script.contentRating,
      customMetadata: filteredMetadata,
      // activity structured fields (PublicScript top-level)
      activityName: script.activityName,
      activityContent: script.activityContent,
      // demoLinks: PublicScript.activityDemoLinks is a JSON string from API
      demoLinks: (() => {
        const raw = script.activityDemoLinks;
        if (!raw) return undefined;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return undefined;
      })(),
    },
    script.title || "Script"
  );
}
