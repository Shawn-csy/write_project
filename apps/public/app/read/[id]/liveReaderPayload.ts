import { parseScreenplay } from "@write/script-engine";
import type { AstNode, MarkerConfig, TocEntry } from "@write/script-engine";
import { encodeCrawlSafePayload } from "@/lib/crawl-safe-payload";
import { liveApi } from "@/lib/liveApi";
import { resolveMarkerConfigsWith } from "@/lib/markerThemeResolver";
import type { PublicScript } from "@/lib/types";

/** What ScriptReaderClient needs, already in the crawl-safe encoding it decodes. */
export interface ReaderPayload {
  initialScript: PublicScript;
  scriptAst: AstNode;
  markerConfigs: MarkerConfig[];
  toc: TocEntry[];
}

/** Views and likes change on every visit; they must not count as an edit. */
export function scriptContentSignature(script: PublicScript): string {
  return JSON.stringify({ ...script, views: null, likes: null });
}

/** Mirrors the server render in page.tsx so a browser-built reader is identical. */
export async function buildReaderPayload(script: PublicScript): Promise<ReaderPayload> {
  const markerConfigs = await resolveMarkerConfigsWith(script, async () => {
    const { data } = await liveApi.readJson<Array<{ id?: string; configs?: unknown }>>("/api/themes/public");
    return data;
  });
  const document = script.content ? parseScreenplay(script.content, markerConfigs) : null;
  return encodeCrawlSafePayload({
    initialScript: script,
    scriptAst: document?.ast ?? ({ type: "root", children: [] } as AstNode),
    markerConfigs,
    toc: document?.toc ?? [],
  });
}
