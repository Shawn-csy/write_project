import { buildExportMetadata } from "@write/reader-export";
import type { ExportMetadata } from "@write/reader-export";
import type { PublicScript } from "./types";

/**
 * Adapts PublicScript to the shared ExportMetadata model used for PDF header generation.
 * Maps Next-specific field names to the shared ExportMetadataSource shape.
 */
export function buildPublicReaderExportMetadata(script: PublicScript): ExportMetadata {
  return buildExportMetadata(
    {
      title: script.title,
      synopsis: script.synopsis,
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
      customMetadata: script.customMetadata,
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
