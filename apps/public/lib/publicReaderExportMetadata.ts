import { buildExportMetadata, isPublicMetadataSystemKey } from "@write/reader-export";
import type { ExportMetadata } from "@write/reader-export";
import type { PublicScript } from "./types";

/**
 * Adapts PublicScript to the shared ExportMetadata model used for PDF header generation.
 * Maps Next-specific field names to the shared ExportMetadataSource shape.
 *
 * Only passes free-form (non-system-key) customMetadata entries to the shared export builder.
 * System keys (targetAudience, license, synopsis, etc.) are now canonical top-level fields
 * and must not be read from customMetadata on the public path.
 */
export function buildPublicReaderExportMetadata(script: PublicScript): ExportMetadata {
  // Filter customMetadata: strip system keys, keep only arbitrary user-defined entries.
  const freeFormMetadata = (script.customMetadata ?? []).filter((entry) => {
    const key = String(entry.key ?? "").trim();
    return key && !isPublicMetadataSystemKey(key);
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
      customMetadata: freeFormMetadata,
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
