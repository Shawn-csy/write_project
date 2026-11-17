import type { ExternalPublicScript, PublicPersona, PublicScript } from "./types";
import type { PublicWorkLaneItem } from "@/components/PublicWorkLane";
import { externalCoverSrc } from "./externalCover";

/** Match scripts to the same confirmed identity used by the author directory. */
export function authorDirectoryWorks(author: PublicPersona, scripts: PublicScript[], externalScripts: ExternalPublicScript[]): PublicWorkLaneItem[] {
  const works: PublicWorkLaneItem[] = [];
  const seen = new Set<string>();
  const add = (work: PublicWorkLaneItem) => {
    const key = work.url || work.id;
    if (!seen.has(key)) { seen.add(key); works.push(work); }
  };
  for (const script of scripts) {
    if (script.persona?.id === author.id && script.isPublic !== false && script.isPublic !== 0) {
      add({ id: `internal-${script.id}`, title: script.title, url: `/read/${encodeURIComponent(script.id)}`, coverUrl: script.coverUrl });
    }
  }
  for (const script of externalScripts) {
    if (script.status !== "published") continue;
    const externalKey = script.externalAuthorId || script.authorKey || script.authorProfileKey
      || (script.authorName || "").trim().normalize("NFKC").toLocaleLowerCase();
    if ((script.authorPersonaId && script.authorPersonaId === author.id)
      || (!script.authorPersonaId && author.id === `external-author:${externalKey}`)) {
      add({ id: `external-${script.id}`, title: script.title || script.remoteTitle || "未命名台本", url: script.sourceUrl, coverUrl: externalCoverSrc(script), sourceLabel: script.sourceName });
    }
  }
  for (const work of author.workParticipations || []) {
    if (work.creditRole === "scriptwriter") add({ id: `participation-${work.id}`, title: work.title, url: work.url, coverUrl: work.coverUrl, workType: work.workType });
  }
  return works;
}
