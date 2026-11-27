import { v5 as uuidv5 } from "uuid";
import { BASE_URL } from "./seo";
import portfolioWorks from "./portfolioWorkCatalog.json";
import type { PublicWorkParticipation } from "./types";

// Only editions verified against the publisher share a work identity.
const audioEditions: Record<string, string> = {
  "737e04d8-367b-4369-b962-e5a7c2a03055": "56cc96ae-5efe-4263-8cc3-fff215513496",
  "84de9b5e-4827-4b76-8476-f3705349a5cb": "ab1beed0-1359-4b1c-94aa-a61f44795023",
};

export function audioCardId(id: string) {
  return `audio-${audioEditions[id] ?? id}`;
}

export function workHref(id: string) {
  return `/works/${encodeURIComponent(id)}`;
}

const portfolioByUrl = new Map(portfolioWorks.map(work => [work.url, work.id]));

/** A reviewed profile can also reference the public card directly. */
export function referencedCardId(value: string) {
  try {
    const url = new URL(value, BASE_URL);
    const match = url.origin === new URL(BASE_URL).origin && /^\/works\/([^/]+)\/?$/.exec(url.pathname);
    return match ? decodeURIComponent(match[1]) : undefined;
  } catch { return undefined; }
}

export function participationCardId(work: PublicWorkParticipation, personaId: string) {
  if (work.audioWorkId) return audioCardId(work.audioWorkId);
  const internalGame = /^\/games(?:\/|#game-)(\d+)\/?$/.exec(work.url);
  if (internalGame) return `steam-${internalGame[1]}`;
  try {
    const url = new URL(work.url);
    const steam = url.hostname === "store.steampowered.com" && /^\/app\/(\d+)(?:\/|$)/.exec(url.pathname);
    if (steam) return `steam-${steam[1]}`;
    const portfolioId = portfolioByUrl.get(url.href);
    if (portfolioId) return portfolioId;
    if (["https:", "http:"].includes(url.protocol)) return `source-${uuidv5(url.href, uuidv5.URL)}`;
  } catch { /* Historical entries can consist of a title alone. */ }
  return `credit-${personaId}-${work.id}`;
}
