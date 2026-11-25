import type { PublicWorkPerformer } from "./publicWorkPerformers";
import type { PublicAudioWork } from "./types";

export function audioWorkSource(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "dlsite.com" || host.endsWith(".dlsite.com")) return "DLsite";
    if (host === "cxc.today" || host.endsWith(".cxc.today")) return "CxC";
    return host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function audioWorkPurchaseLabel(url: string): string {
  const platform = audioWorkSource(url);
  if (platform === "DLsite") return "DLsite 購買頁";
  if (platform === "CxC") return "CxC 作品頁";
  return "前往作品頁";
}

const VOICE_ROLE = /^(?:聲演|聲優|声優|配音|CV)$/i;
const CREDIT_LINE = /^\s*[【〔]?([^：:|｜】〕]+)[】〕]?\s*[：:|｜]\s*(.+)$/;

function textKey(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

const AGE_LINE = /^(?:成人向|R\s*-?\s*18)(?:\s*[・·／/、|｜]\s*(?:成人向|R\s*-?\s*18))*$/i;
const CXC_UPDATE_LINE = /^CxC\s*(?:最後更新|更新日期|更新)\s*[：:]\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}$/i;
const RATING_LINE = /^(?:分級|分级|年齡分級)\s*[：:]\s*(?:成人向|R\s*-?\s*18)$/i;
const SOURCE_LINE = /^(DLsite|CxC)\s*(?:購買頁|作品頁|購買連結|試聽頁)$/i;

export function publicAudioWorkContent(work: PublicAudioWork, performers: PublicWorkPerformer[], description = work.description || "") {
  const isAdult = /成人向|\bR\s*-?\s*18\b/i.test(`${work.title}\n${description}\n${work.description || ""}`);
  const performerNames = new Set(performers.map((person) => textKey(person.name)));
  const credits = work.credits || [];
  const platform = audioWorkSource(work.url).toLowerCase();
  const introduction = description.split("\n").filter((raw) => {
    const line = raw.trim();
    const creditLine = line.match(CREDIT_LINE);
    if (creditLine) {
      const [, role, names] = creditLine;
      const creditedNames = textKey(names);
      const personNames = names.split(/[、,，／]+|\s+\/\s+/).map(textKey).filter(Boolean);
      if (VOICE_ROLE.test(role.trim())) {
        if (performerNames.has(creditedNames)
          || (personNames.length > 0 && personNames.every((name) => performerNames.has(name)))
          || credits.some((credit) => credit.role === "voice_actor" && textKey(credit.creditedAs) === creditedNames)) return false;
      } else if (credits.some((credit) => textKey(credit.sourceRole) === textKey(role) && textKey(credit.creditedAs) === creditedNames)) {
        return false;
      }
    }
    if (AGE_LINE.test(line) || RATING_LINE.test(line)) return false;
    if (platform === "cxc" && CXC_UPDATE_LINE.test(line)) return false;
    const source = line.match(SOURCE_LINE)?.[1];
    return !source || source.toLowerCase() !== platform;
  }).join("\n").trim();
  const sources = [...new Set((work.credits || []).flatMap((credit) => {
    const url = credit.sourceUrl?.trim();
    return credit.provenance === "official_page" && url && /^https?:\/\//i.test(url) ? [url] : [];
  }))];
  return { isAdult, introduction, sources };
}


export function audioWorkReleaseTime(work: PublicAudioWork): number | undefined {
  const { publishedAt } = work;
  if (publishedAt == null || !Number.isFinite(new Date(publishedAt).getTime()) || publishedAt <= 0) return undefined;
  if (audioWorkSource(work.url) === "CxC" && !new URL(work.url).pathname.includes("/track/")) return undefined;
  return publishedAt;
}

export function audioWorkPublication(work: PublicAudioWork) {
  const time = audioWorkReleaseTime(work);
  if (time === undefined) return null;
  const date = new Date(time);
  return {
    label: audioWorkSource(work.url) === "CxC" ? "上架" : "發售",
    dateTime: date.toISOString(),
    text: new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Taipei" }).format(date),
  };
}
