import portfolioWorks from "./portfolioWorkCatalog.json";
import gameDetailsMap from "./gameDetails.json";
import { hasAdultCategory } from "./externalScriptCard";
import { isAdultScript } from "./readPageSeo";
import { gameCatalog, gameResourceAvatars } from "./gameCatalog";
import { gameCreditIdentity } from "./gameCredits";
import { buildScriptGroups, type DemoCatalogBundle } from "./demoCatalog";
import { publicScriptAttribution } from "./publicScriptAttribution";
import { publicIdentityRoleLabel } from "./publicIdentityMetadata";
import { audioWorkPublication, audioWorkPurchaseLabel, audioWorkSource, publicAudioWorkContent } from "./publicAudioWorkContent";
import { publicAudioPerformers, publicDemoPerformers } from "./publicWorkPerformers";
import { externalCoverSrc } from "./externalCover";
import { cleanScriptSummary } from "./scriptSummary";
import { audioCardId, participationCardId, referencedCardId, workHref } from "./workIdentity";
import { legacyVoiceWorkParticipations } from "./publicWorkParticipations";
import type { PublicAudioWork, PublicWorkParticipation } from "./types";
import type { WorkSummary, WorkKind, CatalogWork, Credit } from "./workCardModel";

export type { CatalogWork, Credit, WorkKind, WorkLink, WorkSummary } from "./workCardModel";
export type WorkBundle = DemoCatalogBundle & { audioWorks?: PublicAudioWork[] };
export const WORK_SECTIONS = ["scripts", "externalPublicScripts", "audioWorks", "personas", "demoSubmissions", "organizations"] as const;

const detailsByAppId = gameDetailsMap as Record<string, {
  developers?: string[];
  releaseDate?: string;
  shortDescription?: string;
}>;

const sourceRoles: Record<string, string[]> = {
  scriptwriter: ["台本", "台本師", "劇本", "編劇", "腳本", "シナリオ", "作者"],
  voice_actor: ["聲演", "配音"],
  cover_art: ["封面", "插畫", "美術"],
  recording_studio: ["錄音", "錄音師", "錄音室", "錄音／混音"],
  post_production: ["後製"],
};

function normalizeCreditRole(role: string, sourceRole?: string): string {
  const raw = (sourceRole || role || "").replace(/^[▶■●・\s]+/, "").trim();
  if (role === "scriptwriter" || role === "script" || role === "author" || /^(台本|台本師|劇本|編劇|腳本|シナリオ|作者)$/.test(raw)) {
    return "台本";
  }
  if (role === "cover_art" || role === "illustration" || role === "art_design" || /^(封面|插畫|美術|イラスト)$/.test(raw)) {
    return "美術";
  }
  if (role === "post_production" || raw === "後製") {
    return "後製";
  }
  if (role === "recording_studio" || role === "recording" || /^(錄音|錄音師|錄音室)$/.test(raw)) {
    return "錄音";
  }
  if (role === "sound_direction" || /^(聲音導演|聲導)$/.test(raw)) {
    return "聲音導演";
  }
  if (role === "sound_design" || raw === "音效") {
    return "音效";
  }
  if (role === "music" || /^(音樂|作曲)$/.test(raw)) {
    return "音樂";
  }
  if (raw === "封面/標題設計") return "封面／標題設計";
  return raw || role;
}

export function buildWorkCatalog(bundle: WorkBundle) {
  const works = new Map<string, CatalogWork>();
  const byUrl = new Map<string, CatalogWork>();
  const people = new Map((bundle.personas ?? []).map((person) => [person.id, person]));
  const avatarsById: Record<string, string> = {
    ...gameResourceAvatars,
    ...Object.fromEntries((bundle.personas ?? []).filter((p) => p.avatar).map((p) => [p.id, p.avatar!])),
  };

  function credit(work: CatalogWork, entry: Credit) {
    if (!entry.name) return;
    const match = entry.href?.match(/^\/author\/([^/]+)$/);
    if (match) entry.personaId = decodeURIComponent(match[1]);
    if (!entry.avatar && entry.personaId) {
      entry.avatar = avatarsById[entry.personaId];
    }
    const existing = work.credits.find(
      (c) =>
        c.role === entry.role
        && ((entry.personaId && c.personaId === entry.personaId) || (c.name.normalize("NFKC") === entry.name.normalize("NFKC") && c.href === entry.href)),
    );
    if (existing) {
      existing.source ||= entry.source;
      existing.avatar ||= entry.avatar;
    } else {
      work.credits.push(entry);
    }
  }

  function add(data: WorkSummary & Partial<Pick<CatalogWork, "summary" | "subtitle" | "isAdult" | "isFree" | "externalHref" | "externalLabel">>) {
    const existing = works.get(data.id);
    if (existing) return existing;
    const work: CatalogWork = { ...data, links: [], credits: [], demos: [] };
    works.set(work.id, work);
    return work;
  }

  function link(work: CatalogWork, href: string, label: string) {
    if (!/^(?:https?:\/\/|\/(?!\/))/i.test(href) || work.links.some((l) => l.href === href)) return;
    work.links.push({ label, href });
  }

  for (const script of bundle.scripts ?? []) {
    if (script.isPublic === false || script.isPublic === 0) continue;
    const readHref = `/read/${encodeURIComponent(script.id)}`;
    const w = add({
      id: `script-${script.id}`,
      kind: "script",
      gated: isAdultScript(script) || hasAdultCategory([script.contentRating ?? ""]),
      title: script.title,
      cover: script.coverUrl,
      summary: cleanScriptSummary(script.synopsis),
      primaryHref: readHref,
    });
    const author = publicScriptAttribution(script);
    credit(w, { role: "台本", name: author.authorName, href: author.authorHref });
    link(w, readHref, "閱讀台本");
  }

  for (const script of bundle.externalPublicScripts ?? []) {
    if (script.status && script.status !== "published") continue;
    const sourceName = script.sourceName || script.sourceDomain || "閱讀原作";
    const w = add({
      id: `external-${script.id}`,
      kind: "external",
      gated: hasAdultCategory(script.categories),
      title: script.title || script.remoteTitle || "未命名台本",
      cover: externalCoverSrc(script),
      summary: cleanScriptSummary(script.summary || script.remoteSummary),
      subtitle: sourceName,
      externalHref: script.sourceUrl || undefined,
      externalLabel: sourceName,
    });
    const author = publicScriptAttribution(script);
    credit(w, { role: "台本", name: author.authorName, href: author.authorHref });
    if (script.sourceUrl) {
      link(w, script.sourceUrl, "閱讀原作");
      byUrl.set(script.sourceUrl, w);
    }
  }

  for (const group of buildScriptGroups(bundle.scripts ?? [], bundle.externalPublicScripts ?? [], bundle.demoSubmissions ?? [], bundle.organizations ?? [])) {
    const w = works.get(`${group.scriptType === "internal" ? "script" : "external"}-${group.id}`);
    if (!w) continue;
    for (const demo of group.demos) {
      if (!/^https?:\/\//i.test(demo.url)) continue;
      w.demos.push({ label: demo.name || "播放 Demo", href: demo.url });
      const actors = publicDemoPerformers(demo, people);
      for (const actor of actors) {
        credit(w, { role: "Demo 聲演", name: actor.name, href: actor.href, avatar: actor.avatar, source: demo.url });
      }
    }
  }

  // Process the main edition before alternate listings regardless of API ordering.
  const audio = [...(bundle.audioWorks ?? [])].sort(
    (a, b) => Number(audioCardId(a.id) !== `audio-${a.id}`) - Number(audioCardId(b.id) !== `audio-${b.id}`),
  );
  for (const item of audio) {
    const performers = publicAudioPerformers(item);
    const { isAdult, introduction } = publicAudioWorkContent(item, performers);
    const publication = audioWorkPublication(item);
    const purchaseLabel = audioWorkPurchaseLabel(item.url);
    const subtitleParts = [item.creatorName?.trim(), publication ? `${publication.label} ${publication.text}` : ""].filter(Boolean);
    const w = add({
      id: audioCardId(item.id),
      kind: "audio",
      gated: true,
      title: item.title,
      cover: item.coverUrl,
      summary: introduction,
      subtitle: subtitleParts.join(" · ") || undefined,
      isAdult,
      isFree: item.accessType === "free",
      externalHref: item.url || undefined,
      externalLabel: purchaseLabel,
    });
    if (item.url) byUrl.set(item.url, w);
    const platform = audioWorkSource(item.url) === "dlaf.jp" ? "DLsite" : audioWorkSource(item.url);
    const edition = item.id === "84de9b5e-4827-4b76-8476-f3705349a5cb" ? "免費版（前半部）" : item.accessType === "free" ? "免費版" : "";
    link(w, item.url, [platform || "作品頁", edition].filter(Boolean).join(" · "));
    for (const p of performers) {
      credit(w, { role: "聲演", name: p.name, href: p.href, avatar: p.avatar });
    }
    for (const c of item.credits ?? []) {
      if (c.role !== "voice_actor") {
        credit(w, {
          role: normalizeCreditRole(c.role, c.sourceRole),
          name: c.creditedAs,
          href: c.personaId ? `/author/${encodeURIComponent(c.personaId)}` : undefined,
          avatar: c.personaAvatar,
          source: c.sourceUrl,
        });
      }
    }
    if (item.creatorName) {
      credit(w, {
        role: "製作",
        name: item.creatorName,
        href: item.organizationId ? `/org/${encodeURIComponent(item.organizationId)}` : item.creatorUrl,
      });
    }
  }

  for (const game of gameCatalog) {
    const detail = detailsByAppId[game.appId];
    const steamUrl = `https://store.steampowered.com/app/${game.appId}/?l=tchinese`;
    const subtitleParts = [detail?.developers?.join("、"), detail?.releaseDate].filter(Boolean);
    const w = add({
      id: `steam-${game.appId}`,
      kind: "game",
      gated: true,
      title: game.title,
      cover: game.screenshotUrl,
      summary: detail?.shortDescription || undefined,
      subtitle: subtitleParts.join(" · ") || undefined,
      isAdult: true,
      primaryHref: `/games/${game.appId}`,
      externalHref: steamUrl,
      externalLabel: "Steam 商店",
    });
    link(w, steamUrl, "Steam 商店");
    for (const c of game.credits) {
      const person = gameCreditIdentity(c);
      credit(w, {
        role: c.role,
        name: c.attribution,
        href: person ? `/author/${person.id}` : undefined,
        avatar: person ? avatarsById[person.id] : undefined,
        source: c.sourceUrl,
      });
    }
    for (const name of game.performers ?? []) {
      if (!game.credits.some((c) => c.category === "配音" && (c.attribution === name || c.attribution.startsWith(name + "（")))) {
        credit(w, { role: "配音", name });
      }
    }
  }

  for (const item of portfolioWorks) {
    const w = byUrl.get(item.url) ?? add({
      id: item.id,
      kind: item.kind as WorkKind,
      gated: true,
      title: item.title,
      cover: item.cover,
      externalHref: item.url || undefined,
      externalLabel: audioWorkPurchaseLabel(item.url || "") || "前往原作",
    });
    if (item.url) byUrl.set(item.url, w);
    link(w, item.url, "前往原作");
    if (item.portfolioUrl && item.portfolioUrl !== item.url) link(w, item.portfolioUrl, "製作履歷");
    if (item.parentSteamId) {
      const parent = works.get(`steam-${item.parentSteamId}`);
      link(w, parent ? (parent.primaryHref || workHref(parent.id)) : `https://store.steampowered.com/app/${item.parentSteamId}/`, "本篇遊戲");
      if (parent) link(parent, workHref(w.id), "遊戲原聲帶");
    }
  }

  for (const person of bundle.personas ?? []) {
    const participations: PublicWorkParticipation[] = person.workParticipations ?? [
      ...(person.productionCredits ?? []),
      ...legacyVoiceWorkParticipations(person),
    ];
    for (const p of participations) {
      if (p.creditRole === "voice_actor" && person.voiceActorHidden) continue;
      const reference = referencedCardId(p.url);
      const id = reference || participationCardId(p, person.id);
      const appId = id.startsWith("steam-") ? id.slice(6) : "";
      let w = p.audioWorkId ? works.get(id) : byUrl.get(p.url) ?? works.get(id);
      if (!w) {
        if (p.audioWorkId || reference) continue;
        const targetUrl = appId ? `https://store.steampowered.com/app/${appId}/` : p.url;
        w = add({
          id,
          kind: p.workType ?? "audio",
          gated: true,
          title: p.title,
          cover: p.coverUrl,
          summary: p.description,
          externalHref: targetUrl || undefined,
          externalLabel: targetUrl ? (audioWorkPurchaseLabel(targetUrl) || "前往原作") : undefined,
        });
        if (targetUrl) link(w, targetUrl, audioWorkPurchaseLabel(targetUrl) || "前往原作");
      }
      const href = `/author/${encodeURIComponent(person.id)}`;
      const name = p.creditedAs || person.displayName;
      const role = normalizeCreditRole(p.creditRole, publicIdentityRoleLabel(p.creditRole));
      if (!p.characterName && w.credits.some((c) => c.personaId === person.id && (c.role === role || sourceRoles[p.creditRole]?.includes(c.role)))) continue;
      credit(w, { role, name: p.characterName ? `${name}（${p.characterName}）` : name, href, avatar: person.avatar });
    }
  }
  return works;
}

export function cardsForPersona(catalog: ReadonlyMap<string, CatalogWork>, personaId: string) {
  return Array.from(catalog.values()).filter((work) => work.credits.some((c) => c.personaId === personaId));
}

export function cardsForExternalScripts(catalog: ReadonlyMap<string, CatalogWork>, items: { id: string }[]) {
  return items.flatMap((item) => {
    const card = catalog.get(`external-${item.id}`);
    return card ? [card] : [];
  });
}
