import { fetchApi } from "./client";
import type { ExternalPublicScript } from "../../types/api";

export interface StudioExternalScriptPreview {
  sourceUrl: string;
  canonicalUrl?: string;
  sourceDomain?: string;
  sourceName?: string;
  authorName?: string;
  authorBio?: string;
  authorUrl?: string;
  remoteTitle?: string;
  remoteSummary?: string;
  remoteCoverUrl?: string;
  sourceCreatedAt?: number | null;
}

export interface StudioExternalScriptPayload {
  sourceUrl: string;
  authorPersonaId: string;
  canonicalUrl?: string;
  sourceDomain?: string;
  sourceName?: string;
  remoteTitle?: string;
  remoteSummary?: string;
  remoteCoverUrl?: string;
  titleOverride: string;
  summaryOverride: string;
  coverUrlOverride: string;
  seriesName: string;
  categories: string[];
}

const path = "/studio/external-public-scripts";

export const getStudioExternalScripts = (): Promise<ExternalPublicScript[]> =>
  fetchApi<ExternalPublicScript[]>(path, { cache: "no-store" });

export const previewStudioExternalScript = (sourceUrl: string, authorUrl?: string): Promise<StudioExternalScriptPreview> =>
  fetchApi<StudioExternalScriptPreview>(`${path}/preview`, {
    method: "POST",
    body: JSON.stringify({ sourceUrl, authorUrl }),
  });

export const publishStudioExternalScript = (payload: StudioExternalScriptPayload): Promise<ExternalPublicScript> =>
  fetchApi<ExternalPublicScript>(path, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const deleteStudioExternalScript = (id: string): Promise<{ success: boolean }> =>
  fetchApi<{ success: boolean }>(`${path}/${encodeURIComponent(id)}`, { method: "DELETE" });
