"use client";

import { PublicPersonLink, PublicPlayLink } from "@/components/PublicDirectoryDetails";
import * as Dialog from "@radix-ui/react-dialog";
import { PublicSubmissionDialogContent } from "@/components/PublicSubmissionDialogContent";
import { PublicBackButton } from "@/components/PublicBackButton";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import Link from "next/link";
import { PublicSubmissionTrigger } from "@/components/PublicSubmissionTrigger";
import { BookOpen, ExternalLink, Play } from "lucide-react";
import { PublicHeroMarquee, type HeroSlide, type HeroImageRenderer } from "@write/public-ui";
import { HeroImage } from "@/components/HeroImage";
import { PublicVoiceTypes, PublicWorkDetails } from "@/components/PublicWorkDetails";
import { mergePublicDemoLinks, parsePublicDemoLinks, publicSubmittedDemoLink, type DemoLink } from "@/lib/publicDemoLinks";
import { demoArtwork } from "@/lib/demoArtwork";
import { publicScriptAttribution } from "@/lib/publicScriptAttribution";
import { publicDemoPerformers } from "@/lib/publicWorkPerformers";
import { PublicImage } from "@/components/PublicImage";
import { PublicListSkeleton } from "@/components/PublicSkeleton";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { liveApi } from "@/lib/liveApi";
import { readPublicBundle } from "@/lib/readPublicBundle";
import type { ActivityPage, ExternalPublicScript, PublicDemoSubmission, PublicPersona, PublicScript } from "@/lib/types";
import { cleanScriptSummary } from "@/lib/scriptSummary";

const ACTIVITY_WORK_SECTIONS = ["scripts", "externalPublicScripts", "demoSubmissions", "personas"] as const;

interface ActivityBundle {
  activityPages?: ActivityPage[];
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
  demoSubmissions?: PublicDemoSubmission[];
  personas?: PublicPersona[];
}

interface ActivityWork {
  id: string;
  title: string;
  summary: string;
  coverUrl: string;
  href: string;
  source: "本站台本" | "外部台本";
  authorName: string;
  authorHref?: string;
  authorAvatarUrl?: string;
  demos: DemoLink[];
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

export function ActivityHubClient({ initialPages, initialSlug = "" }: { initialPages?: ActivityPage[]; initialSlug?: string }) {
  const [bundle, setBundle] = useState<ActivityBundle>({});
  const [isLoading, setIsLoading] = useState(initialPages === undefined);
  const [worksStatus, setWorksStatus] = useState<"idle" | "ready" | "error">("idle");
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const submissionTrigger = useRef<HTMLButtonElement>(null);
  const [submissionOpen, setSubmissionOpen] = useState(false);
  const [submissionMode, setSubmissionMode] = useState<"demo" | "script" | null>(null);
  const [submissionTarget, setSubmissionTarget] = useState("");
  const [voiceActorEntryMode, setVoiceActorEntryMode] = useState<"profile" | "custom">("custom");
  const [submissionError, setSubmissionError] = useState("");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (initialPages === undefined) {
      void readPublicBundle<ActivityBundle>(["activityPages"])
        .then(({ data }) => {
          if (!active) return;
          setBundle((current) => ({ ...current, activityPages: data.activityPages }));
          setIsLoading(false);
        })
        .catch(() => { if (active) setIsLoading(false); });
    }
    const syncSelected = () => {
      setSelectedSlug(new URL(window.location.href).searchParams.get("event") || "");
      setSubmissionOpen(false);
    };
    syncSelected();
    window.addEventListener("popstate", syncSelected);
    return () => { active = false; window.removeEventListener("popstate", syncSelected); };
  }, [initialPages, initialSlug]);

  const activityPages = bundle.activityPages ?? initialPages;
  const pages = useMemo(() => (activityPages || []).filter((page) => page.status === "published").sort((a, b) => a.sortOrder - b.sortOrder || (b.publishedAt || 0) - (a.publishedAt || 0)), [activityPages]);
  const selectedPage = pages.find((page) => page.slug === selectedSlug) || (pages.length === 1 ? pages[0] : null);
  const needsWorks = Boolean(selectedPage && (selectedPage.acceptingSubmissions || selectedPage.scriptIds.length || selectedPage.externalScriptIds.length));
  useEffect(() => {
    if (!needsWorks || worksStatus !== "idle") return;
    let active = true;
    void readPublicBundle<ActivityBundle>(ACTIVITY_WORK_SECTIONS)
      .then(({ data }) => {
        if (!active) return;
        setBundle((current) => ({
          ...current,
          scripts: data.scripts,
          externalPublicScripts: data.externalPublicScripts,
          demoSubmissions: data.demoSubmissions,
          personas: data.personas,
        }));
        setWorksStatus("ready");
      })
      .catch(() => { if (active) setWorksStatus("error"); });
    return () => { active = false; };
  }, [needsWorks, worksStatus]);
  const worksReady = !needsWorks || worksStatus === "ready";
  const scriptById = useMemo(() => new Map((bundle.scripts || []).map((script) => [script.id, script])), [bundle.scripts]);
  const externalScriptById = useMemo(() => new Map((bundle.externalPublicScripts || []).map((script) => [script.id, script])), [bundle.externalPublicScripts]);
  const selectedWorks = useMemo<ActivityWork[]>(() => {
    if (!selectedPage) return [];
    const submissions = bundle.demoSubmissions || [];
    const internalWorks = selectedPage.scriptIds.flatMap((id) => {
      const script = scriptById.get(id);
      if (!script) return [];
      const demos = mergePublicDemoLinks([
        ...parsePublicDemoLinks(script.activityDemoLinks),
        ...submissions.filter((item) => item.scriptType === "internal" && item.scriptId === id).flatMap(publicSubmittedDemoLink),
      ]);
      return [{ id, title: script.title, summary: cleanScriptSummary(script.synopsis), coverUrl: script.coverUrl || "", href: `/read/${encodeURIComponent(id)}`, source: "本站台本" as const, ...publicScriptAttribution(script), demos }];
    });
    const externalWorks = selectedPage.externalScriptIds.flatMap((id) => {
      const script = externalScriptById.get(id);
      if (!script) return [];
      const demos = mergePublicDemoLinks([
        ...parsePublicDemoLinks(script.demoLinks),
        ...submissions.filter((item) => item.scriptType === "external" && item.externalScriptId === id).flatMap(publicSubmittedDemoLink),
      ]);
      return [{ id, title: script.title || script.remoteTitle || "未命名台本", summary: cleanScriptSummary(script.summary || script.remoteSummary), coverUrl: script.coverUrl || script.coverUrlOverride || script.remoteCoverUrl || "", href: script.sourceUrl, source: "外部台本" as const, ...publicScriptAttribution(script), demos }];
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
        const actorId = String(form.get("voiceActorId") || "").trim();
        const actorName = String(form.get("voiceActorName") || "").trim();
        const actorSocialUrl = String(form.get("voiceActorSocialUrl") || "").trim();
        const customActor = form.get("voiceActorEntryMode") === "custom";
        if (customActor && !actorName) throw new Error("請填寫聲演名稱。");
        if (!customActor && !actorId) throw new Error("請選擇聲演身份。");
        if (customActor && form.get("confirmVoiceActorProfiles") !== "on") throw new Error("請確認已取得聲演本人同意公開姓名與社群連結。");
        return {
          scriptType: type,
          ...(type === "internal" ? { scriptId: id } : { externalScriptId: id }),
          activityPageId: selectedPage.id,
          demoName: String(form.get("demoName") || "").trim(),
          demoUrl: String(form.get("demoUrl") || "").trim(),
          coverUrl: String(form.get("coverUrl") || "").trim(),
          cast: String(form.get("cast") || "").trim(),
          voiceTypes: form.getAll("voiceTypes").filter((item): item is string => item === "male" || item === "female"),
          voiceActorIds: customActor ? [] : [actorId],
          manualVoiceActors: customActor ? [{ name: actorName, socialUrl: actorSocialUrl }] : [],
          description: String(form.get("description") || "").trim(),
          displayName: String(form.get("displayName") || "").trim(),
          contactEmail: String(form.get("contactEmail") || "").trim(),
          confirmPublic: form.get("confirmPublic") === "on",
          confirmVoiceActorProfiles: customActor && form.get("confirmVoiceActorProfiles") === "on",
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
      if (submissionMode === "demo") {
        try {
          const { data } = await liveApi.readJson<ActivityBundle>("/api/public-bundle", { cache: "no-store" });
          setBundle(data);
        } catch {
          // The successful submission remains valid if the follow-up refresh fails.
        }
      }
      setSubmissionMessage(submissionMode === "demo" ? "Demo 已送出並公開，現在會顯示在所選台本的 Demo 區。" : "台本已公開並加入此活動頁。 ");
      formElement.reset();
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "送出失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const voiceActors = (bundle.personas || []).filter((persona) => !persona.voiceActorHidden && (persona.tags || []).some((tag) => /聲演|配音|voice[\s-]?actor/i.test(tag)));

  const openSubmission = (trigger: HTMLButtonElement, mode: "demo" | "script", target = "") => {
    submissionTrigger.current = trigger;
    setSubmissionMode(mode);
    setVoiceActorEntryMode("custom");
    setSubmissionTarget(target);
    setSubmissionError("");
    setSubmissionMessage("");
    setSubmissionOpen(true);
  };

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

  return <div className="flex flex-1 flex-col bg-background">
    <PublicBrowseMain>
      {isLoading && !activityPages ? <PublicListSkeleton rows={4} className="mx-auto max-w-3xl pt-4" />
        : selectedPage ? <article>
          {pages.length > 1 && <PublicBackButton label="返回活動清單" onClick={backToEvents} className="mb-4" />}
          <div className={`-mx-4 sm:-mx-6 lg:-mx-8 ${pages.length === 1 ? "-mt-4 sm:-mt-6 lg:-mt-8" : ""}`}><PublicHeroMarquee slides={activityHero} fullBleed renderImage={activityHeroImage as HeroImageRenderer} labels={{ region: "活動主視覺" }} /></div>
          {selectedPage.body && <section className="mt-8 max-w-3xl space-y-4">{renderContent(selectedPage.body)}</section>}
          {worksReady && selectedPage.acceptingSubmissions && <aside aria-label="投稿" className="mt-6 flex flex-col gap-3 border-l-4 border-cta bg-muted p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0"><p className="text-base font-semibold">想參加這個活動？</p><p className="mt-0.5 text-sm text-muted-foreground">投稿 Demo 或台本，審核後會加入下方活動列表。</p></div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <PublicSubmissionTrigger quiet label="投稿 Demo" onClick={(event) => openSubmission(event.currentTarget, "demo")} />
              <PublicSubmissionTrigger label="投稿台本" onClick={(event) => openSubmission(event.currentTarget, "script")} />
            </div>
          </aside>}
          {!worksReady && (worksStatus === "error"
            ? <PublicEmptyState className="mt-6 border-y border-border" title="無法載入活動作品" primaryAction={{ label: "重新載入", onClick: () => setWorksStatus("idle") }} />
            : <PublicListSkeleton rows={3} className="mt-6" />)}
          {worksReady && selectedWorks.length === 0 && <PublicEmptyState className="mt-6 border-y border-border" title="這個活動還沒有台本或 Demo" description={selectedPage.acceptingSubmissions ? "成為第一位投稿的人吧。" : "活動內容公開後會顯示在這裡。"} primaryAction={pages.length > 1 ? { label: "查看其他活動", onClick: backToEvents } : { label: "回到台本首頁", href: "/" }} />}
          {worksReady && selectedWorks.length > 0 && <section className="mt-10">
            <div className="mb-4"><h2 className="text-xl font-semibold">活動台本與 Demo</h2></div>
            <div className="space-y-3">{selectedWorks.map((work) => {
              const firstDemo = work.demos[0];
              const workArtwork = demoArtwork(firstDemo?.url || "", firstDemo?.coverUrl, work.coverUrl);
              return <article key={`${work.source}:${work.id}`} data-feedback-target={`activity-script-${work.source === "本站台本" ? "internal" : "external"}`} data-feedback-title={work.title} className={`grid min-w-0 overflow-hidden rounded-md border border-border bg-card ${work.demos.length ? "lg:grid-cols-[minmax(17rem,0.34fr)_minmax(0,0.66fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(13rem,0.28fr)]"}`}>
              <div className={`grid min-h-28 min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r ${work.demos.length ? "lg:grid-cols-[minmax(7rem,0.36fr)_minmax(0,0.64fr)]" : "lg:grid-cols-[minmax(10rem,0.34fr)_minmax(0,0.66fr)]"}`}>
                <Link href={work.href} target={work.source === "外部台本" ? "_blank" : undefined} rel={work.source === "外部台本" ? "noopener noreferrer" : undefined} aria-label={`閱讀台本「${work.title}」`} className={`group relative min-h-full overflow-hidden bg-muted ${work.demos.length ? "" : "min-h-36 lg:min-h-48"}`}>
                  <BookOpen className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground/50" aria-hidden />
                  {workArtwork && <PublicImage src={workArtwork} alt={`${work.title}封面`} preset="script-cover" className="group-hover:opacity-90" />}
                </Link>
                <div className="flex min-w-0 flex-col justify-center p-3 sm:p-4">
                  <Link href={work.href} target={work.source === "外部台本" ? "_blank" : undefined} rel={work.source === "外部台本" ? "noopener noreferrer" : undefined} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-link">{work.title}{work.source === "外部台本" && <ExternalLink className="ml-1 inline h-3 w-3" />}</Link>
                  {work.authorName && <span className="mt-1 [font-size:var(--public-font-caption)] text-muted-foreground">台本師：{work.authorHref ? <PublicPersonLink href={work.authorHref} name={work.authorName} avatar={work.authorAvatarUrl} compact /> : work.authorName}</span>}
                  {work.summary && <p className="mt-1 line-clamp-2 [font-size:var(--public-font-caption)] leading-4 text-muted-foreground">{work.summary}</p>}
                  <Link href={work.href} target={work.source === "外部台本" ? "_blank" : undefined} rel={work.source === "外部台本" ? "noopener noreferrer" : undefined} className="mt-2 inline-flex min-h-7 w-fit items-center gap-1 [font-size:var(--public-font-caption)] font-semibold text-link">台本資訊 <ExternalLink className="h-3 w-3" aria-hidden /></Link>
                </div>
              </div>
              <section aria-label={`${work.title}的演出版本`} className="min-w-0">
                {work.demos.length > 0 ? <><div className="flex min-h-9 items-center border-b border-border px-3"><h3 className="text-xs font-semibold">演出與試聽</h3></div><div className="grid gap-2 p-2">{work.demos.map((demo, index) => {
                  const name = demo.name || `演出版本 ${index + 1}`;
                  const preview = demoArtwork(demo.url, demo.coverUrl, work.coverUrl);
                  return (
                    <PublicWorkDetails
                      key={`${demo.id}-${index}`}
                      heading="h4"
                      title={name}
                      data-feedback-target="activity-demo"
                      data-feedback-title={`${work.title}｜${name}`}
                      meta={<PublicVoiceTypes types={demo.voiceTypes} />}
                      artwork={<div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                        {preview ? <PublicImage src={preview} alt="Demo 預覽" preset="thumbnail" /> : <Play className="absolute inset-0 m-auto size-4 text-muted-foreground" aria-hidden />}
                      </div>}
                      action={<PublicPlayLink href={demo.url} target="_blank" rel="noopener noreferrer" aria-label={`試聽 ${name}`} className="text-xs">試聽</PublicPlayLink>}
                      performers={publicDemoPerformers(demo, personasById)}
                      description={demo.description}
                    />
                  );
                })}</div></> : <div className="flex min-h-28 items-center justify-center p-4 lg:min-h-48">{selectedPage.acceptingSubmissions && <PublicSubmissionTrigger label="投稿 Demo" onClick={(event) => openSubmission(event.currentTarget, "demo", `${work.source === "本站台本" ? "internal" : "external"}:${work.id}`)} />}</div>}
              </section>
            </article>;
            })}</div>
          </section>}
        </article>
        : pages.length > 0 ? <section><PublicBrowseHeader title="主題企劃與活動" /><div className="grid gap-4 sm:grid-cols-2">{pages.map((page) => <button key={page.id} type="button" onClick={() => openPage(page.slug)} className="overflow-hidden rounded-md border border-border bg-card text-left">{page.coverUrl && <div className="relative aspect-[16/8] overflow-hidden bg-muted"><PublicImage src={page.coverUrl} alt={`${page.title}封面`} preset="script-cover" crop={page.coverCrop} /></div>}<div className="p-4"><h2 className="text-lg font-semibold">{page.title}</h2>{page.summary && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{page.summary}</p>}<span className="mt-3 inline-block text-xs font-semibold text-link">查看活動 →</span></div></button>)}</div></section>
        : <PublicEmptyState className="border-y border-border" title="目前沒有公開活動" description="活動內容發布後會顯示在這裡，先逛逛公開台本吧。" primaryAction={{ label: "瀏覽公開台本", href: "/" }} secondaryAction={{ label: "看看 Demo 專區", href: "/demos" }} />}
    </PublicBrowseMain>
    {submissionMode && selectedPage && (
      <Dialog.Root open={submissionOpen} onOpenChange={setSubmissionOpen}>
        <PublicSubmissionDialogContent
          title={submissionMode === "demo" ? "投稿 Demo" : "投稿台本"}
          description="填寫作品資料，投稿後會加入活動專區。"
          width="large"
          returnFocus={submissionTrigger}
        >
        {submissionMessage ? <div role="status" className="mt-5 space-y-4"><p className="rounded-lg border border-success bg-success-muted p-4 text-sm">{submissionMessage}</p><button type="button" onClick={() => setSubmissionOpen(false)} className="h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">完成</button></div> : <form onSubmit={submitActivityEntry} className="mt-5 space-y-4 text-sm">
          {submissionMode === "demo" ? <>
            <label className="grid gap-1.5 text-sm font-medium">對應台本<select name="scriptTarget" value={submissionTarget} onChange={(event) => setSubmissionTarget(event.target.value)} required className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">選擇活動台本</option>{selectedWorks.map((work) => <option key={`${work.source}:${work.id}`} value={`${work.source === "本站台本" ? "internal" : "external"}:${work.id}`}>{work.title}</option>)}</select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">Demo 名稱<input name="demoName" maxLength={160} className="h-11 rounded-md border border-input bg-background px-3 text-sm font-normal" placeholder="例如：角色名／第 1 話" /></label><label className="grid gap-1.5 text-sm font-medium">公開 Demo 連結<input name="demoUrl" type="url" required className="h-11 rounded-md border border-input bg-background px-3 text-sm font-normal" placeholder="https://…" /></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">封面連結（選填）<input name="coverUrl" type="url" className="h-11 rounded-md border border-input bg-background px-3 text-sm font-normal" placeholder="https://…" /></label><fieldset className="grid gap-3 rounded-lg border border-border bg-muted p-4 text-sm sm:col-span-2"><legend className="px-1 font-semibold">聲演</legend><input type="hidden" name="voiceActorEntryMode" value={voiceActorEntryMode} /><div className="flex flex-wrap gap-2"><button type="button" aria-pressed={voiceActorEntryMode === "custom"} onClick={() => setVoiceActorEntryMode("custom")} className={`h-9 rounded-md border px-3 text-sm font-medium ${voiceActorEntryMode === "custom" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>建立聲演</button><button type="button" aria-pressed={voiceActorEntryMode === "profile"} onClick={() => setVoiceActorEntryMode("profile")} className={`h-9 rounded-md border px-3 text-sm font-medium ${voiceActorEntryMode === "profile" ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>選擇既有身份</button></div>{voiceActorEntryMode === "profile" ? <label className="grid gap-1.5 text-sm font-medium">聲演身份<select name="voiceActorId" required className="h-11 rounded-md border border-input bg-background px-3 text-sm font-normal"><option value="">選擇公開聲演身份</option>{voiceActors.map((persona) => <option key={persona.id} value={persona.id}>{persona.displayName}</option>)}</select></label> : <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">聲演名稱<input name="voiceActorName" required maxLength={120} className="h-11 rounded-md border border-input bg-background px-3 text-sm font-normal" placeholder="公開顯示名稱" /></label><label className="grid gap-1.5 text-sm font-medium">社群帳號／連結（選填）<input name="voiceActorSocialUrl" type="url" className="h-11 rounded-md border border-input bg-background px-3 text-sm font-normal" placeholder="https://…" /></label><label className="flex items-start gap-2 text-sm font-normal sm:col-span-2"><input name="confirmVoiceActorProfiles" type="checkbox" required className="mt-1" />我已取得聲演本人同意，公開姓名與社群連結。</label></div>}</fieldset><label className="grid gap-1.5 text-sm font-medium">演出角色／內容<input name="cast" maxLength={500} className="h-11 rounded-md border border-input bg-background px-3 text-sm font-normal" placeholder="角色或演出內容" /></label><fieldset className="grid gap-2 text-sm sm:col-span-2"><legend className="font-medium">聲線類型（可複選）</legend><div className="flex gap-5"><label className="flex items-center gap-2"><input type="checkbox" name="voiceTypes" value="male" />男聲演</label><label className="flex items-center gap-2"><input type="checkbox" name="voiceTypes" value="female" />女聲演</label></div></fieldset><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">簡介<textarea name="description" rows={3} maxLength={2000} className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal" /></label><label className="grid gap-1.5 text-sm font-medium">投稿者名稱<input name="displayName" maxLength={120} className="h-11 rounded-md border border-input bg-background px-3 text-sm font-normal" /></label><label className="grid gap-1.5 text-sm font-medium">聯絡 Email（選填）<input name="contactEmail" type="email" className="h-11 rounded-md border border-input bg-background px-3 text-sm font-normal" /></label><label className="flex items-start gap-2 text-sm sm:col-span-2"><input name="confirmPublic" type="checkbox" required className="mt-1" />我確認連結可公開瀏覽，且有權提供此 Demo。</label></div>
          </> : <>
            <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-sm font-medium">台本名稱<input name="scriptTitle" required maxLength={300} className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1.5 text-sm font-medium">台本師<input name="authorName" required maxLength={120} className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">台本文件連結<input name="documentUrl" type="url" required className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://…" /></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">台本介紹<textarea name="scriptSummary" rows={3} maxLength={4000} className="rounded-md border border-input bg-background p-3 text-sm" /></label><label className="grid gap-1.5 text-sm font-medium">作者社群連結（選填）<input name="authorSocialUrl" type="url" className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://…" /></label><label className="grid gap-1.5 text-sm font-medium">封面連結（選填）<input name="coverUrl" type="url" className="h-10 rounded-md border border-input bg-background px-3 text-sm" placeholder="https://…" /></label><label className="grid gap-1.5 text-sm font-medium">標籤（逗號分隔）<input name="categories" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1.5 text-sm font-medium">系列（選填）<input name="seriesName" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1.5 text-sm font-medium">聯絡名稱<input name="contactName" required className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1.5 text-sm font-medium">聯絡 Email（選填）<input name="contactEmail" type="email" className="h-10 rounded-md border border-input bg-background px-3 text-sm" /></label><label className="grid gap-1.5 text-sm font-medium sm:col-span-2">備註<textarea name="notes" rows={3} className="rounded-md border border-input bg-background p-3 text-sm" /></label><label className="flex items-start gap-2 text-sm sm:col-span-2"><input name="confirmPublicListing" type="checkbox" required className="mt-0.5" />我確認台本文件可公開瀏覽，且我有權提交此作品。</label></div>
          </>}
          {submissionError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{submissionError}</p>}<footer className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card pt-3 pb-1"><button type="button" onClick={() => setSubmissionOpen(false)} className="h-10 rounded-md border border-border px-4 text-sm">取消</button><button type="submit" disabled={isSubmitting} className="h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{isSubmitting ? "送出中…" : "送出並公開"}</button></footer>
        </form>}
        </PublicSubmissionDialogContent>
      </Dialog.Root>
    )}
  </div>;
}
