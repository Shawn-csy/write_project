"use client";

import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ExternalLink, Loader2, Play, Plus, X } from "lucide-react";
import { PublicHeroMarquee, type HeroSlide, type HeroImageRenderer } from "@write/public-ui";
import { PublicTopBar } from "@/components/PublicTopBar";
import { HeroImage } from "@/components/HeroImage";
import { PublicImage } from "@/components/PublicImage";
import { liveApi } from "@/lib/liveApi";
import type { ActivityPage, ExternalPublicScript, PublicDemoSubmission, PublicPersona, PublicScript } from "@/lib/types";

interface ActivityBundle {
  activityPages?: ActivityPage[];
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
  demoSubmissions?: PublicDemoSubmission[];
  personas?: PublicPersona[];
}

interface ActivityDemo {
  id: string;
  name: string;
  url: string;
  coverUrl: string;
  cast: string;
  voiceTypes: Array<"male" | "female">;
  voiceActorIds: string[];
  manualVoiceActors: Array<{ name: string; socialUrl?: string; personaId?: string }>;
  description: string;
}

interface ActivityWork {
  id: string;
  title: string;
  summary: string;
  coverUrl: string;
  href: string;
  source: "本站台本" | "外部台本";
  authorName: string;
  demos: ActivityDemo[];
}

function parseDemoLinks(value: unknown): ActivityDemo[] {
  let parsed = value;
  if (typeof parsed === "string") {
    try { parsed = JSON.parse(parsed); } catch { parsed = []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    const url = String(item.url || item.link || "").trim();
    if (!/^https?:\/\//i.test(url)) return [];
    return [{
      id: String(item.id || `demo-${index + 1}`),
      name: String(item.name || item.title || item.label || "").trim(),
      url,
      coverUrl: String(item.coverUrl || item.thumbnailUrl || item.imageUrl || "").trim(),
      cast: String(item.cast || item.voiceActor || item.speaker || "").trim(),
      voiceTypes: Array.isArray(item.voiceTypes) ? item.voiceTypes.filter((type): type is "male" | "female" => type === "male" || type === "female") : [],
      voiceActorIds: Array.isArray(item.voiceActorIds) ? item.voiceActorIds.map(String) : [],
      manualVoiceActors: Array.isArray(item.manualVoiceActors) ? item.manualVoiceActors.flatMap((actor) => {
        if (!actor || typeof actor !== "object") return [];
        const entry = actor as Record<string, unknown>;
        const name = String(entry.name || "").trim();
        return name ? [{ name, socialUrl: String(entry.socialUrl || ""), personaId: String(entry.personaId || "") }] : [];
      }) : [],
      description: String(item.description || item.desc || "").trim(),
    }];
  });
}

function youtubeThumbnail(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const videoId = host === "youtu.be" ? parsed.pathname.split("/").filter(Boolean)[0]
      : host === "youtube.com" || host === "m.youtube.com" ? parsed.searchParams.get("v") || parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
        : null;
    return videoId ? `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "";
  } catch { return ""; }
}

function voiceNames(demo: ActivityDemo, personas: Map<string, PublicPersona>): Array<{ name: string; href?: string }> {
  const linked = demo.voiceActorIds.flatMap((id) => {
    const persona = personas.get(id);
    return persona ? [{ name: persona.displayName, href: persona.externalHref || `/author/${encodeURIComponent(id)}` }] : [];
  });
  const manual = demo.manualVoiceActors.map((actor) => ({
    name: actor.name,
    href: actor.personaId ? `/author/${encodeURIComponent(actor.personaId)}` : actor.socialUrl,
  }));
  const legacy = demo.cast.split(/[、,，/／|;；\n]+/).map((name) => name.trim())
    .filter((name) => name && !/^(作者|原作者|台本師|編劇|劇本師|腳本家|シナリオライター|author|writer)/i.test(name))
    .map((name) => ({ name: name.replace(/^(聲演|声優|配音|演出者|cast)\s*[:：]?\s*/i, "") }));
  const byName = new Map<string, { name: string; href?: string }>();
  [...linked, ...manual, ...legacy].forEach((actor) => { if (actor.name.trim()) byName.set(actor.name.trim(), { ...actor, name: actor.name.trim() }); });
  return [...byName.values()];
}

function renderContent(body: string) {
  return body.trim().split(/\n\s*\n/).filter(Boolean).map((block, index) => {
    const lines = block.split("\n");
    if (lines[0].startsWith("## ")) return <h2 key={index} className="mt-8 text-xl font-semibold">{lines[0].slice(3)}</h2>;
    if (lines[0].startsWith("### ")) return <h3 key={index} className="mt-6 text-lg font-semibold">{lines[0].slice(4)}</h3>;
    if (lines.every((line) => /^\s*-\s+/.test(line))) return <ul key={index} className="list-disc space-y-1 pl-6 text-sm leading-7 text-muted-foreground">{lines.map((line, lineIndex) => <li key={lineIndex}>{line.replace(/^\s*-\s+/, "")}</li>)}</ul>;
    return <p key={index} className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{block.replace(/^#\s+/gm, "")}</p>;
  });
}

export function ActivityHubClient() {
  const [bundle, setBundle] = useState<ActivityBundle>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [submissionMode, setSubmissionMode] = useState<"demo" | "script" | null>(null);
  const [submissionError, setSubmissionError] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void liveApi.readJson<ActivityBundle>("/api/public-bundle", { cache: "no-store" })
      .then(({ data }) => { if (active) { setBundle(data); setIsLoading(false); } })
      .catch(() => { if (active) setIsLoading(false); });
    const syncSelected = () => setSelectedSlug(new URL(window.location.href).searchParams.get("event") || "");
    syncSelected();
    window.addEventListener("popstate", syncSelected);
    return () => { active = false; window.removeEventListener("popstate", syncSelected); };
  }, []);

  const pages = useMemo(() => (bundle.activityPages || []).filter((page) => page.status === "published").sort((a, b) => a.sortOrder - b.sortOrder || (b.publishedAt || 0) - (a.publishedAt || 0)), [bundle.activityPages]);
  const selectedPage = pages.find((page) => page.slug === selectedSlug) || (pages.length === 1 ? pages[0] : null);
  const scriptById = useMemo(() => new Map((bundle.scripts || []).map((script) => [script.id, script])), [bundle.scripts]);
  const externalScriptById = useMemo(() => new Map((bundle.externalPublicScripts || []).map((script) => [script.id, script])), [bundle.externalPublicScripts]);
  const selectedWorks = useMemo<ActivityWork[]>(() => {
    if (!selectedPage) return [];
    const submissions = bundle.demoSubmissions || [];
    const internalWorks = selectedPage.scriptIds.flatMap((id) => {
      const script = scriptById.get(id);
      if (!script) return [];
      const isOverride = script.authorDisplayMode?.toLowerCase() === "override" || Boolean(script.authorOverrideName?.trim());
      const authorName = (isOverride ? script.authorOverrideName : script.persona?.displayName || script.owner?.displayName)?.trim() || "";
      const demos = [
        ...parseDemoLinks(script.activityDemoLinks),
        ...submissions.filter((item) => item.scriptType === "internal" && item.scriptId === id).map((item) => ({
          id: item.id, name: item.demoName || "", url: item.demoUrl, coverUrl: item.coverUrl || "", cast: item.cast || "",
          voiceTypes: item.voiceTypes || [], voiceActorIds: item.voiceActorIds || [], manualVoiceActors: item.manualVoiceActors || [], description: item.description || "",
        })),
      ];
      return [{ id, title: script.title, summary: script.synopsis || "", coverUrl: script.coverUrl || "", href: `/read/${encodeURIComponent(id)}`, source: "本站台本" as const, authorName, demos }];
    });
    const externalWorks = selectedPage.externalScriptIds.flatMap((id) => {
      const script = externalScriptById.get(id);
      if (!script) return [];
      const demos = [
        ...parseDemoLinks(script.demoLinks),
        ...submissions.filter((item) => item.scriptType === "external" && item.externalScriptId === id).map((item) => ({
          id: item.id, name: item.demoName || "", url: item.demoUrl, coverUrl: item.coverUrl || "", cast: item.cast || "",
          voiceTypes: item.voiceTypes || [], voiceActorIds: item.voiceActorIds || [], manualVoiceActors: item.manualVoiceActors || [], description: item.description || "",
        })),
      ];
      return [{ id, title: script.title || script.remoteTitle || "外部台本", summary: script.summary || script.remoteSummary || "", coverUrl: script.coverUrl || script.coverUrlOverride || script.remoteCoverUrl || "", href: script.sourceUrl, source: "外部台本" as const, authorName: script.authorName || "", demos }];
    });
    return [...internalWorks, ...externalWorks];
  }, [bundle.demoSubmissions, externalScriptById, scriptById, selectedPage]);
  const personasById = useMemo(() => new Map((bundle.personas || []).map((persona) => [persona.id, persona])), [bundle.personas]);
  const activityHero: HeroSlide[] = selectedPage ? [{
    id: `activity-${selectedPage.id}`,
    title: selectedPage.title,
    subtitle: selectedPage.summary || undefined,
    background: "default",
    overlayOpacity: selectedPage.coverUrl ? 38 : undefined,
    ...(selectedPage.coverUrl ? { image: { url: selectedPage.coverUrl, alt: `${selectedPage.title}活動主視覺`, crop: selectedPage.coverCrop, backgroundMode: "cover" as const } } : {}),
  }] : [];
  const activityHeroImage = (image: NonNullable<HeroSlide["image"]>, slide: HeroSlide, index: number) => (
    <HeroImage image={image} slideTitle={slide.title} priority={index === 0} />
  );

  const submitActivityEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPage || !submissionMode) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSubmissionError("");
    setSubmissionMessage("");
    setIsSubmitting(true);
    try {
      const payload = submissionMode === "demo" ? (() => {
        const target = String(form.get("scriptTarget") || "").split(":");
        const type = target[0];
        const id = target.slice(1).join(":");
        if (!id || (type !== "internal" && type !== "external")) throw new Error("請選擇活動中的對應台本。");
        const actorId = String(form.get("voiceActorId") || "");
        if (!actorId) throw new Error("請選擇聲演身份。");
        return {
          scriptType: type,
          ...(type === "internal" ? { scriptId: id } : { externalScriptId: id }),
          activityPageId: selectedPage.id,
          demoName: String(form.get("demoName") || "").trim(),
          demoUrl: String(form.get("demoUrl") || "").trim(),
          coverUrl: String(form.get("coverUrl") || "").trim(),
          cast: String(form.get("cast") || "").trim(),
          voiceTypes: form.getAll("voiceTypes").filter((item): item is string => item === "male" || item === "female"),
          voiceActorIds: [actorId],
          manualVoiceActors: [],
          description: String(form.get("description") || "").trim(),
          displayName: String(form.get("displayName") || "").trim(),
          contactEmail: String(form.get("contactEmail") || "").trim(),
          confirmPublic: form.get("confirmPublic") === "on",
          confirmVoiceActorProfiles: false,
        };
      })() : {
        kind: "listing",
        activityPageId: selectedPage.id,
        pageUrl: typeof window === "undefined" ? "" : window.location.href,
        contactName: String(form.get("contactName") || "").trim(),
        contactEmail: String(form.get("contactEmail") || "").trim(),
        scriptTitle: String(form.get("scriptTitle") || "").trim(),
        scriptSummary: String(form.get("scriptSummary") || "").trim(),
        authorName: String(form.get("authorName") || "").trim(),
        authorBio: String(form.get("authorBio") || "").trim(),
        authorSocialUrl: String(form.get("authorSocialUrl") || "").trim(),
        documentUrl: String(form.get("documentUrl") || "").trim(),
        coverUrl: String(form.get("coverUrl") || "").trim(),
        categories: String(form.get("categories") || "").split(/[,，、]/).map((value) => value.trim()).filter(Boolean),
        seriesName: String(form.get("seriesName") || "").trim(),
        notes: String(form.get("notes") || "").trim(),
        content: String(form.get("notes") || "").trim(),
        confirmPublicListing: form.get("confirmPublicListing") === "on",
      };
      const response = await liveApi.write(submissionMode === "demo" ? "/api/public-demo-submissions" : "/api/public-feedback", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result?.detail === "string" ? result.detail : "送出失敗，請稍後再試。");
      setSubmissionMessage(submissionMode === "demo" ? "Demo 已送出並公開，現在會顯示在所選台本的 Demo 區。" : "台本已公開並加入此活動頁。 ");
      formElement.reset();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "送出失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const voiceActors = (bundle.personas || []).filter((persona) => !persona.voiceActorHidden && (persona.tags || []).some((tag) => /聲演|配音|voice[\s-]?actor/i.test(tag)));

  const openPage = (slug: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("event", slug);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedSlug(slug);
  };
  const backToEvents = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("event");
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedSlug("");
  };

  return <div className="flex min-h-screen flex-col bg-background">
    <PublicTopBar activeTab="activities" />
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 lg:px-8">
      {isLoading ? <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />載入活動專區…</div>
        : selectedPage ? <article>
          {pages.length > 1 && <button type="button" onClick={backToEvents} className="mb-4 inline-flex h-9 items-center gap-1 rounded-md border border-border/70 px-3 text-sm text-muted-foreground hover:bg-muted/60"><ChevronLeft className="h-4 w-4" />所有活動</button>}
          <div className="-mx-4 -mt-7 sm:-mx-6 lg:-mx-8"><PublicHeroMarquee slides={activityHero} fullBleed renderImage={activityHeroImage as HeroImageRenderer} labels={{ region: "活動主視覺" }} /></div>
          {selectedPage.acceptingSubmissions && <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4"><div><h2 className="text-sm font-semibold">參加活動徵件</h2><p className="mt-1 text-xs text-muted-foreground">投稿 Demo 或提交新台本，審核通過後會安排到活動頁。</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setSubmissionMode("demo"); setSubmissionError(""); setSubmissionMessage(""); }} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-semibold hover:bg-muted"><Plus className="h-3.5 w-3.5" />投稿 Demo</button><button type="button" onClick={() => { setSubmissionMode("script"); setSubmissionError(""); setSubmissionMessage(""); }} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-3.5 w-3.5" />投稿台本</button></div></section>}
          {selectedPage.body && <section className="mx-auto mt-8 max-w-3xl space-y-4">{renderContent(selectedPage.body)}</section>}
          {selectedWorks.length > 0 && <section className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">活動台本與 Demo</h2><span className="text-xs text-muted-foreground">{selectedWorks.length} 部台本</span></div>
            <div className="space-y-3">{selectedWorks.map((work) => <article key={`${work.source}:${work.id}`} className="grid min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/40 lg:grid-cols-[minmax(17rem,0.34fr)_minmax(0,0.66fr)]">
              <div className="grid min-h-28 min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] border-b border-border/70 lg:min-h-0 lg:grid-cols-[minmax(7rem,0.36fr)_minmax(0,0.64fr)] lg:border-b-0 lg:border-r">
                <Link href={work.href} target={work.source === "外部台本" ? "_blank" : undefined} rel={work.source === "外部台本" ? "noopener noreferrer" : undefined} aria-label={`閱讀台本「${work.title}」`} className="group relative min-h-full overflow-hidden bg-muted/40">
                  <BookOpen className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground/50" aria-hidden />
                  {(youtubeThumbnail(work.demos[0]?.url || "") || work.coverUrl) && <PublicImage src={youtubeThumbnail(work.demos[0]?.url || "") || work.coverUrl} alt={`${work.title}封面`} preset="script-cover" className="transition-transform duration-300 group-hover:scale-[1.03]" />}
                </Link>
                <div className="flex min-w-0 flex-col justify-center p-3 sm:p-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5"><span className="text-[10px] text-muted-foreground">{work.source}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{work.demos.length} 筆 Demo</span></div>
                  <Link href={work.href} target={work.source === "外部台本" ? "_blank" : undefined} rel={work.source === "外部台本" ? "noopener noreferrer" : undefined} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">{work.title}{work.source === "外部台本" && <ExternalLink className="ml-1 inline h-3 w-3" />}</Link>
                  {work.authorName && <span className="mt-1 truncate text-[11px] text-muted-foreground">台本師：{work.authorName}</span>}
                  {work.summary && <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{work.summary}</p>}
                  <Link href={work.href} target={work.source === "外部台本" ? "_blank" : undefined} rel={work.source === "外部台本" ? "noopener noreferrer" : undefined} className="mt-2 inline-flex min-h-7 w-fit items-center gap-1 text-[11px] font-semibold text-primary">台本資訊 <ExternalLink className="h-3 w-3" aria-hidden /></Link>
                </div>
              </div>
              <section aria-label={`${work.title}的演出版本`} className="min-w-0">
                <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border/70 px-3"><h3 className="text-xs font-semibold">演出與試聽</h3><span className="text-[10px] text-muted-foreground">{work.demos.length} 筆 Demo</span></div>
                {work.demos.length > 0 ? <div className="divide-y divide-border/60">{work.demos.map((demo, index) => {
                  const actors = voiceNames(demo, personasById);
                  const preview = youtubeThumbnail(demo.url) || work.coverUrl || demo.coverUrl;
                  let platform = "外部連結";
                  try { platform = new URL(demo.url).hostname.replace(/^www\./i, ""); } catch { /* Keep generic label. */ }
                  return <div key={`${demo.id}-${index}`} className="grid min-h-[4.25rem] grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 hover:bg-muted/50 sm:grid-cols-[6rem_minmax(0,1fr)_auto]">
                    <a href={demo.url} target="_blank" rel="noopener noreferrer" aria-label={`試聽 ${demo.name || `演出版本 ${index + 1}`}`} className="relative aspect-video overflow-hidden rounded-md bg-muted/70">{preview ? <PublicImage src={preview} alt="Demo 預覽" preset="thumbnail" /> : <Play className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" aria-hidden />}</a>
                    <span className="min-w-0"><a href={demo.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs font-medium leading-5 hover:text-primary">{demo.name || `演出版本 ${index + 1}`}</a><span className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] leading-4 text-muted-foreground"><span className="shrink-0">聲演：</span>{actors.length ? actors.map((actor, actorIndex) => <Fragment key={`${actor.name}-${actorIndex}`}>{actorIndex > 0 && <span>、</span>}{actor.href ? <a href={actor.href} target={actor.href.startsWith("http") ? "_blank" : undefined} rel={actor.href.startsWith("http") ? "noopener noreferrer" : undefined} className="truncate hover:text-primary hover:underline">{actor.name}</a> : <span className="truncate">{actor.name}</span>}</Fragment>) : <span>{demo.cast ? demo.cast : "資料未標示"}</span>}{demo.voiceTypes.map((type) => <span key={type} className="rounded-full bg-muted px-1.5 py-0.5">{type === "male" ? "男聲演" : "女聲演"}</span>)}<span className="ml-1">· {platform}</span></span>{demo.description && <span className="mt-0.5 block line-clamp-1 text-[10px] text-muted-foreground">{demo.description}</span>}</span>
                    <a href={demo.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 text-[10px] font-semibold text-primary hover:bg-primary/15"><Play className="h-3 w-3 fill-current" aria-hidden />試聽</a>
                  </div>;
                })}</div> : <p className="px-3 py-4 text-xs text-muted-foreground">目前沒有公開 Demo。</p>}
              </section>
            </article>)}</div>
          </section>}
        </article>
        : pages.length > 0 ? <section><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">活動專區</p><h1 className="mt-1 font-serif text-3xl font-bold">主題企劃與活動</h1><p className="mt-2 text-sm text-muted-foreground">瀏覽目前公開的活動頁與主題台本。</p><div className="mt-6 grid gap-4 sm:grid-cols-2">{pages.map((page) => <button key={page.id} type="button" onClick={() => openPage(page.slug)} className="overflow-hidden rounded-xl border border-border/70 bg-card/50 text-left transition-colors hover:border-primary/40">{page.coverUrl && <div className="relative aspect-[16/8] overflow-hidden bg-muted"><PublicImage src={page.coverUrl} alt={`${page.title}封面`} preset="script-cover" crop={page.coverCrop} /></div>}<div className="p-4"><h2 className="text-lg font-semibold">{page.title}</h2>{page.summary && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{page.summary}</p>}<span className="mt-3 inline-block text-xs font-semibold text-primary">查看活動 →</span></div></button>)}</div></section>
        : <div className="rounded-xl border border-dashed p-10 text-center"><h1 className="font-serif text-2xl font-bold">目前沒有公開活動</h1><p className="mt-2 text-sm text-muted-foreground">活動內容發布後會顯示在這裡。</p></div>}
    </main>
    {submissionMode && selectedPage && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSubmissionMode(null); setSubmissionMessage(""); } }}>
      <section role="dialog" aria-modal="true" aria-labelledby="activity-submit-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border/70 p-4"><div><h2 id="activity-submit-title" className="text-lg font-semibold">{submissionMode === "demo" ? "投稿活動 Demo" : "投稿活動台本"}</h2><p className="mt-1 text-xs text-muted-foreground">{selectedPage.title} · 投稿後立即公開</p></div><button type="button" aria-label="關閉" onClick={() => { setSubmissionMode(null); setSubmissionMessage(""); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></header>
        {submissionMessage ? <div role="status" className="space-y-4 p-6"><p className="rounded-lg border border-emerald-700/30 bg-emerald-500/10 p-4 text-sm">{submissionMessage}</p><button type="button" onClick={() => { setSubmissionMode(null); setSubmissionMessage(""); }} className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">完成</button></div> : <form onSubmit={submitActivityEntry} className="min-h-0 space-y-3 overflow-y-auto p-4">
          {submissionMode === "demo" ? <>
            <label className="grid gap-1 text-xs">對應台本<select name="scriptTarget" required className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">選擇活動台本</option>{selectedWorks.map((work) => <option key={`${work.source}:${work.id}`} value={`${work.source === "本站台本" ? "internal" : "external"}:${work.id}`}>{work.title} · {work.source}</option>)}</select></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs">Demo 名稱<input name="demoName" maxLength={160} className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="例如：角色名／第 1 話" /></label><label className="grid gap-1 text-xs">公開 Demo 連結<input name="demoUrl" type="url" required className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://…" /></label><label className="grid gap-1 text-xs sm:col-span-2">封面連結（選填）<input name="coverUrl" type="url" className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://…" /></label><label className="grid gap-1 text-xs">聲演身份<select name="voiceActorId" required className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">選擇公開聲演身份</option>{voiceActors.map((persona) => <option key={persona.id} value={persona.id}>{persona.displayName}</option>)}</select></label><label className="grid gap-1 text-xs">演出角色／內容<input name="cast" maxLength={500} className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="角色或演出內容" /></label><fieldset className="grid gap-1 text-xs sm:col-span-2"><legend>聲線類型（可複選）</legend><div className="flex gap-4"><label className="flex items-center gap-1.5"><input type="checkbox" name="voiceTypes" value="male" />男聲演</label><label className="flex items-center gap-1.5"><input type="checkbox" name="voiceTypes" value="female" />女聲演</label></div></fieldset><label className="grid gap-1 text-xs sm:col-span-2">簡介<textarea name="description" rows={3} maxLength={2000} className="rounded-md border border-input bg-background p-3 text-sm" /></label><label className="grid gap-1 text-xs">投稿者名稱<input name="displayName" maxLength={120} className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1 text-xs">聯絡 Email（選填）<input name="contactEmail" type="email" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="flex items-start gap-2 text-xs sm:col-span-2"><input name="confirmPublic" type="checkbox" required className="mt-0.5" />我確認連結可公開瀏覽，且有權提供此 Demo。</label></div>
          </> : <>
            <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs">台本名稱<input name="scriptTitle" required maxLength={300} className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1 text-xs">台本師<input name="authorName" required maxLength={120} className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1 text-xs sm:col-span-2">台本文件連結<input name="documentUrl" type="url" required className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://…" /></label><label className="grid gap-1 text-xs sm:col-span-2">台本介紹<textarea name="scriptSummary" rows={3} maxLength={4000} className="rounded-md border border-input bg-background p-3 text-sm" /></label><label className="grid gap-1 text-xs">作者社群連結（選填）<input name="authorSocialUrl" type="url" className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://…" /></label><label className="grid gap-1 text-xs">封面連結（選填）<input name="coverUrl" type="url" className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://…" /></label><label className="grid gap-1 text-xs">標籤（逗號分隔）<input name="categories" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1 text-xs">系列（選填）<input name="seriesName" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1 text-xs">聯絡名稱<input name="contactName" required className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1 text-xs">聯絡 Email（選填）<input name="contactEmail" type="email" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1 text-xs sm:col-span-2">備註<textarea name="notes" rows={3} className="rounded-md border border-input bg-background p-3 text-sm" /></label><label className="flex items-start gap-2 text-xs sm:col-span-2"><input name="confirmPublicListing" type="checkbox" required className="mt-0.5" />我確認台本文件可公開瀏覽，且我有權提交此作品。</label></div>
          </>}
          {submissionError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{submissionError}</p>}<footer className="flex justify-end gap-2 border-t border-border/70 pt-3"><button type="button" onClick={() => setSubmissionMode(null)} className="h-9 rounded-md border border-border px-3 text-sm">取消</button><button type="submit" disabled={isSubmitting} className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60">{isSubmitting ? "送出中…" : "送出審核"}</button></footer>
        </form>}
      </section>
    </div>}
  </div>;
}
