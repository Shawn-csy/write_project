"use client";

import { PublicEmptyState } from "@/components/PublicEmptyState";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, ChevronLeft, ExternalLink, Play, Plus, Search, X } from "lucide-react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicImage } from "@/components/PublicImage";
import { PublicTopBar } from "@/components/PublicTopBar";
import { liveApi } from "@/lib/liveApi";
import { getPublicVoicePerformances, hasVoiceActorSelfTag } from "@/lib/publicVoicePerformances";
import type { ExternalPublicScript, PublicDemoSubmission, PublicPersona, PublicScript } from "@/lib/types";

interface DemoLink {
  id: string;
  name: string;
  url: string;
  coverUrl: string;
  cast: string;
  voiceTypes: Array<"male" | "female">;
  voiceActorIds: string[];
  manualVoiceActors: ManualVoiceActor[];
  description: string;
}

interface ManualVoiceActor {
  name: string;
  socialUrl: string;
  personaId?: string;
}

interface ManualVoiceActorDraft extends ManualVoiceActor {
  id: string;
}

interface DemoScriptGroup {
  key: string;
  id: string;
  scriptType: "internal" | "external";
  title: string;
  authorName: string;
  summary: string;
  coverUrl: string;
  sourceUrl: string;
  demos: DemoLink[];
}

interface SubmissionTarget {
  value: string;
  type: "internal" | "external";
  title: string;
  authorName: string;
  label: string;
}

interface Props {
  initialScripts: PublicScript[];
  initialExternalScripts: ExternalPublicScript[];
  initialPersonas: PublicPersona[];
  initialSubmissions: PublicDemoSubmission[];
}

const VOICE_ACTOR_TAG_PATTERN = /聲演|配音|voice[\s-]?actor/i;
const GENERIC_DEMO_NAME_PATTERN = /^(演出 demo|demo|試聽|google docs|youtube|vocus|cxc|soundcloud|bilibili|spotify)$/i;

function parseDemoLinks(value: unknown): DemoLink[] {
  let parsed = value;
  if (typeof parsed === "string") {
    const raw = parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw.startsWith("http") ? [{ url: raw }] : [];
    }
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
      coverUrl: String(item.coverUrl || item.thumbnailUrl || item.imageUrl || item.image || "").trim(),
      cast: String(item.cast || item.voiceActor || item.speaker || "").trim(),
      voiceTypes: Array.isArray(item.voiceTypes) ? item.voiceTypes.filter((type): type is "male" | "female" => type === "male" || type === "female") : [],
      voiceActorIds: Array.isArray(item.voiceActorIds) ? item.voiceActorIds.map(String) : [],
      manualVoiceActors: Array.isArray(item.manualVoiceActors)
        ? item.manualVoiceActors.flatMap((actor) => {
          if (!actor || typeof actor !== "object") return [];
          const item = actor as Record<string, unknown>;
          const name = String(item.name || "").trim();
          const socialUrl = String(item.socialUrl || "").trim();
          const personaId = String(item.personaId || "").trim();
          return name ? [{ name, socialUrl: /^https?:\/\//i.test(socialUrl) ? socialUrl : "", personaId }] : [];
        })
        : [],
      description: String(item.description || item.desc || "").trim(),
    }];
  });
}

function youtubeThumbnail(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const videoId = host === "youtu.be"
      ? parsed.pathname.split("/").filter(Boolean)[0]
      : host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com"
        ? parsed.searchParams.get("v") || parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
        : null;
    return videoId ? `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "";
  } catch {
    return "";
  }
}

function buildScriptGroups(
  scripts: PublicScript[],
  externalScripts: ExternalPublicScript[],
  submissions: PublicDemoSubmission[],
): DemoScriptGroup[] {
  const groups = new Map<string, DemoScriptGroup>();
  const addDemos = (
    key: string,
    group: Omit<DemoScriptGroup, "demos">,
    demos: DemoLink[],
  ) => {
    if (demos.length === 0) return;
    const existing = groups.get(key);
    if (existing) existing.demos.push(...demos);
    else groups.set(key, { ...group, demos });
  };

  for (const script of scripts) {
    const key = `internal:${script.id}`;
    addDemos(key, {
      key,
      id: script.id,
      scriptType: "internal",
      title: script.title || "未命名台本",
      authorName: script.persona?.displayName || script.owner?.displayName || "",
      summary: script.synopsis || "",
      coverUrl: script.coverUrl || "",
      sourceUrl: `/read/${encodeURIComponent(script.id)}`,
    }, parseDemoLinks(script.activityDemoLinks));
  }

  for (const script of externalScripts) {
    if (script.status !== "published") continue;
    const key = `external:${script.id}`;
    addDemos(key, {
      key,
      id: script.id,
      scriptType: "external",
      title: script.title || script.remoteTitle || "外部台本",
      authorName: script.authorName || "",
      summary: script.summary || script.remoteSummary || "",
      coverUrl: script.coverUrlOverride || script.coverUrl || script.remoteCoverUrl || "",
      sourceUrl: script.sourceUrl,
    }, parseDemoLinks(script.demoLinks));
  }

  for (const submission of submissions) {
    const scriptType = submission.scriptType === "external" ? "external" : "internal";
    const id = scriptType === "external" ? submission.externalScriptId : submission.scriptId;
    const key = id ? `${scriptType}:${id}` : `submitted:${submission.id}`;
    const linkedExternalScript = scriptType === "external" ? externalScripts.find((script) => script.id === id) : undefined;
    const linkedInternalScript = scriptType === "internal" ? scripts.find((script) => script.id === id) : undefined;
    addDemos(key, {
      key,
      id: id || submission.id,
      scriptType,
      title: submission.scriptTitle || linkedExternalScript?.title || linkedExternalScript?.remoteTitle || linkedInternalScript?.title || "未命名台本",
      authorName: scriptType === "external"
        ? linkedExternalScript?.authorName || ""
        : linkedInternalScript?.persona?.displayName || linkedInternalScript?.owner?.displayName || "",
      summary: scriptType === "external"
        ? linkedExternalScript?.summary || linkedExternalScript?.remoteSummary || ""
        : linkedInternalScript?.synopsis || "",
      coverUrl: scriptType === "external"
        ? linkedExternalScript?.coverUrlOverride || linkedExternalScript?.coverUrl || linkedExternalScript?.remoteCoverUrl || ""
        : linkedInternalScript?.coverUrl || "",
      sourceUrl: submission.scriptUrl,
    }, [{
      id: submission.id,
      name: submission.demoName || "演出 Demo",
      url: submission.demoUrl,
      coverUrl: submission.coverUrl || "",
      cast: submission.cast || "",
      voiceTypes: submission.voiceTypes || [],
      voiceActorIds: submission.voiceActorIds || [],
      manualVoiceActors: (submission.manualVoiceActors || []).map((actor) => ({ name: actor.name, socialUrl: actor.socialUrl || "", personaId: actor.personaId || "" })),
      description: submission.description || "",
    }]);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, demos: group.demos.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant")) }))
    .sort((a, b) => a.title.localeCompare(b.title, "zh-Hant"));
}

function demoActors(demo: DemoLink, personasById: Map<string, PublicPersona>): PublicPersona[] {
  return demo.voiceActorIds
    .map((id) => personasById.get(id))
    .filter((persona): persona is PublicPersona => Boolean(persona));
}

function demoLegacyCastNames(demo: DemoLink): string[] {
  return demo.cast
    .split(/[、,，/／|;；\n]+/)
    .map((value) => value.trim())
    .flatMap((value) => {
      // Legacy cast fields are free text. Keep them in the performer bucket only
      // when they do not explicitly identify an author or scriptwriter.
      if (/^(作者|原作者|台本師|編劇|劇本師|脚本家|シナリオライター|author|writer|script\s*writer)(?:\s*[:：]|\s|$)/i.test(value)) return [];
      return [value.replace(/^(聲演|声優|配音|演出者|cast)\s*[:：]?\s*/i, "").trim()];
    });
}

function demoCastNames(demo: DemoLink): string[] {
  return [...demo.manualVoiceActors.map((actor) => actor.name.trim()), ...demoLegacyCastNames(demo)].filter(Boolean);
}

function demoPlatform(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "外部連結";
  }
}

export function DemoShowcaseClient({ initialScripts, initialExternalScripts, initialPersonas, initialSubmissions }: Props) {
  const [scripts, setScripts] = useState(initialScripts);
  const [externalScripts, setExternalScripts] = useState(initialExternalScripts);
  const [personas, setPersonas] = useState(initialPersonas);
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [liveBundleLoaded, setLiveBundleLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedScriptKey, setSelectedScriptKey] = useState("");
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [target, setTarget] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [voiceActorQuery, setVoiceActorQuery] = useState("");
  const [voiceTypes, setVoiceTypes] = useState<Array<"male" | "female">>([]);
  const [voiceActorIds, setVoiceActorIds] = useState<string[]>([]);
  const [manualVoiceActors, setManualVoiceActors] = useState<ManualVoiceActorDraft[]>([]);
  const [voiceActorError, setVoiceActorError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!submitMessage) return;
    const timeoutId = window.setTimeout(() => setSubmitMessage(""), 7000);
    return () => window.clearTimeout(timeoutId);
  }, [submitMessage]);

  useEffect(() => {
    let active = true;
    void liveApi.readJson<{
      scripts?: PublicScript[];
      externalPublicScripts?: ExternalPublicScript[];
      personas?: PublicPersona[];
      demoSubmissions?: PublicDemoSubmission[];
    }>("/api/public-bundle", { cache: "no-store" })
      .then(({ data: bundle }) => {
        if (!active) return;
        if (Array.isArray(bundle.scripts)) setScripts(bundle.scripts);
        if (Array.isArray(bundle.externalPublicScripts)) setExternalScripts(bundle.externalPublicScripts);
        if (Array.isArray(bundle.personas)) setPersonas(bundle.personas);
        if (Array.isArray(bundle.demoSubmissions)) setSubmissions(bundle.demoSubmissions);
        setLiveBundleLoaded(true);
      })
      .catch(() => { if (active) setLiveBundleLoaded(true); });
    return () => { active = false; };
  }, []);

  const scriptGroups = useMemo(() => buildScriptGroups(scripts, externalScripts, submissions), [scripts, externalScripts, submissions]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleGroups = useMemo(() => normalizedQuery
    ? scriptGroups.filter((group) => [
      group.title,
      group.authorName,
      group.summary,
      ...group.demos.flatMap((demo) => [demo.name, demo.cast, demo.description, ...demo.manualVoiceActors.map((actor) => actor.name)]),
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)))
    : scriptGroups, [scriptGroups, normalizedQuery]);

  useEffect(() => {
    const syncSelectionFromUrl = () => setSelectedScriptKey(new URL(window.location.href).searchParams.get("script") || "");
    syncSelectionFromUrl();
    window.addEventListener("popstate", syncSelectionFromUrl);
    return () => window.removeEventListener("popstate", syncSelectionFromUrl);
  }, []);

  useEffect(() => {
    if (liveBundleLoaded && selectedScriptKey && !scriptGroups.some((group) => group.key === selectedScriptKey)) setSelectedScriptKey("");
  }, [liveBundleLoaded, scriptGroups, selectedScriptKey]);

  const selectedGroup = scriptGroups.find((group) => group.key === selectedScriptKey);
  const selectedGroupCoverUrl = selectedGroup
    ? selectedGroup.demos.map((demo) => youtubeThumbnail(demo.url)).find(Boolean) || selectedGroup.coverUrl || ""
    : "";
  const voiceActors = useMemo(() => personas.filter((persona) => !persona.voiceActorHidden && (
    hasVoiceActorSelfTag(persona)
    || getPublicVoicePerformances(persona.id, { scripts, externalPublicScripts: externalScripts, demoSubmissions: submissions }).length > 0
  )).sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-Hant")), [personas, scripts, externalScripts, submissions]);
  const voiceActorNames = useMemo(() => new Set(voiceActors.map((persona) => persona.displayName.trim().toLocaleLowerCase())), [voiceActors]);
  const voiceActorById = useMemo(() => new Map(personas.map((persona) => [persona.id, persona])), [personas]);
  const selectedVoiceActors = voiceActorIds.map((id) => voiceActorById.get(id)).filter((persona): persona is PublicPersona => Boolean(persona));
  const visibleVoiceActors = voiceActors
    .filter((persona) => `${persona.displayName} ${(persona.tags || []).join(" ")}`.toLocaleLowerCase().includes(voiceActorQuery.trim().toLocaleLowerCase()))
    .slice(0, 20);

  const submissionTargets = useMemo<SubmissionTarget[]>(() => [
    ...scripts.map((script) => {
      const title = script.title || "未命名台本";
      const authorName = script.persona?.displayName || script.owner?.displayName || "";
      return { value: `internal:${script.id}`, type: "internal" as const, title, authorName, label: `本站｜${title}` };
    }),
    ...externalScripts.filter((script) => script.status === "published").map((script) => {
      const title = script.title || script.remoteTitle || "外部台本";
      const authorName = script.authorName || "";
      return { value: `external:${script.id}`, type: "external" as const, title, authorName, label: `外部｜${title}` };
    }),
  ], [scripts, externalScripts]);
  const selectedTarget = submissionTargets.find((option) => option.value === target);
  const visibleTargets = submissionTargets
    .filter((option) => `${option.label} ${option.authorName}`.toLocaleLowerCase().includes(targetSearch.trim().toLocaleLowerCase()))
    .slice(0, 25);

  const toggleVoiceActor = (id: string) => {
    const selected = voiceActorIds.includes(id);
    if ((!selected || voiceActorIds.length > 1) || manualVoiceActors.some((actor) => actor.name.trim())) setVoiceActorError("");
    setVoiceActorIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const openScript = (key: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("script", key);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedScriptKey(key);
  };

  const returnToScriptList = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("script");
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedScriptKey("");
  };

  const handleDemoSubmission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitError("");
    setSubmitMessage("");
    const form = new FormData(formElement);
    const [scriptType, selectedId] = target.split(":", 2);
    if (!selectedId || (scriptType !== "internal" && scriptType !== "external")) {
      setSubmitError("請搜尋並選擇對應台本。");
      return;
    }
    if (manualVoiceActors.some((actor) => !actor.name.trim())) {
      const message = "請填寫或移除空白的聲演姓名。";
      setVoiceActorError(message);
      setSubmitError(message);
      return;
    }
    const manualVoiceActorPayload = manualVoiceActors
      .map(({ name, socialUrl }) => ({ name: name.trim(), socialUrl: socialUrl.trim() }))
      .filter((actor) => actor.name)
      .slice(0, 20);
    if (selectedVoiceActors.length === 0 && manualVoiceActorPayload.length === 0) {
      const message = "請至少加入一位聲演，才能送出 Demo。";
      setVoiceActorError(message);
      setSubmitError(message);
      document.getElementById("demo-submission-voice-actors")?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    setVoiceActorError("");
    if (manualVoiceActors.some((actor) => actor.name.trim()) && form.get("confirmVoiceActorProfiles") !== "on") {
      setSubmitError("請確認已取得名單外聲演建立公開身份頁的同意。");
      return;
    }
    const payload = {
      scriptType,
      ...(scriptType === "internal" ? { scriptId: selectedId } : { externalScriptId: selectedId }),
      demoName: String(form.get("demoName") || "").trim(),
      demoUrl: String(form.get("demoUrl") || "").trim(),
      coverUrl: String(form.get("coverUrl") || "").trim(),
      cast: String(form.get("cast") || "").trim(),
      voiceTypes,
      voiceActorIds,
      manualVoiceActors: manualVoiceActorPayload,
      description: String(form.get("description") || "").trim(),
      displayName: String(form.get("displayName") || "").trim(),
      contactEmail: String(form.get("contactEmail") || "").trim(),
      confirmPublic: form.get("confirmPublic") === "on",
      confirmVoiceActorProfiles: form.get("confirmVoiceActorProfiles") === "on",
      website: String(form.get("website") || "").trim(),
    };
    setIsSubmitting(true);
    try {
      const response = await liveApi.write("/api/public-demo-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result?.detail === "string" ? result.detail : "送出失敗，請稍後再試。 ");
      formElement.reset();
      setTarget("");
      setVoiceTypes([]);
      setVoiceActorIds([]);
      setVoiceActorError("");
      setVoiceActorQuery("");
      setManualVoiceActors([]);
      const consent = formElement.querySelector<HTMLInputElement>('input[name="confirmVoiceActorProfiles"]');
      if (consent) consent.checked = false;
      setSubmitMessage("Demo 已送出並進入審核；審核通過後會顯示在 Demo 專區。");
      setShowSubmissionForm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "送出失敗，請稍後再試。";
      setSubmitError(message);
      if (message.includes("聲演")) setVoiceActorError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicTopBar
        activeTab="demos"
        tabs={[
          { key: "authors", label: "作者", href: "/?view=authors" },
          { key: "voice-actors", label: "聲演", href: "/voice-actors" },
          { key: "demos", label: "Demo 專區", href: "/demos" },
        ]}
      />
      {submitMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-emerald-700/25 bg-background px-4 py-3 text-sm text-foreground shadow-xl sm:left-auto sm:right-6">
          <span className="min-w-0 flex-1">{submitMessage}</span>
          <button type="button" onClick={() => setSubmitMessage("")} aria-label="關閉通知" className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
          {selectedGroup ? (
            <div className="flex min-w-0 items-start gap-3">
              <button type="button" onClick={returnToScriptList} className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 px-2.5 py-2 text-sm hover:bg-muted/60" aria-label="返回台本清單">
                <ChevronLeft className="h-4 w-4" aria-hidden />台本清單
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Demo 專區</p>
                <h1 className="mt-1 line-clamp-2 font-serif text-2xl font-bold sm:text-3xl">{selectedGroup.title}</h1>
                          {selectedGroup.authorName && <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"><span>台本師：{selectedGroup.authorName}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">台本師</span>{voiceActorNames.has(selectedGroup.authorName.trim().toLocaleLowerCase()) && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">聲演</span>}</p>}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">演出與試聽</p>
              <h1 className="mt-1 font-serif text-3xl font-bold">Demo 專區</h1>
              <p className="mt-2 text-sm text-muted-foreground">選一部台本，查看對應的演出與錄音。</p>
            </div>
          )}
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:max-w-xl sm:flex-row sm:items-center">
            {!selectedGroup && (
              <label className="relative block min-w-0 flex-1 sm:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-11 w-full rounded-lg border border-border/70 bg-card pl-9 pr-3 sm:h-10 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                  placeholder="搜尋台本或台本師"
                  aria-label="搜尋台本或台本師"
                />
              </label>
            )}
            <Dialog.Root open={showSubmissionForm} onOpenChange={setShowSubmissionForm}>
              <Dialog.Trigger asChild>
                <button type="button" className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:h-10">
                  <Plus className="h-4 w-4" aria-hidden />投稿 Demo
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-background p-5 shadow-2xl sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="text-lg font-semibold">投稿已錄製的 Demo</Dialog.Title>
                      <Dialog.Description className="mt-1 text-sm text-muted-foreground">選擇台本並提供公開連結，審核通過後會顯示在該台本旁。</Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button type="button" aria-label="關閉投稿表單" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
                    </Dialog.Close>
                  </div>

                  <form onSubmit={handleDemoSubmission} className="mt-5 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm sm:col-span-2">對應台本
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          role="combobox"
                          aria-label="搜尋並選擇對應台本"
                          aria-expanded={targetPickerOpen}
                          aria-controls="demo-submission-target-options"
                          aria-autocomplete="list"
                          required={!targetPickerOpen && !target}
                          value={targetPickerOpen ? targetSearch : selectedTarget?.label || ""}
                          onFocus={() => { setTargetSearch(""); setTargetPickerOpen(true); }}
                          onChange={(event) => { setTargetSearch(event.target.value); setTargetPickerOpen(true); }}
                          onBlur={() => window.setTimeout(() => setTargetPickerOpen(false), 120)}
                          placeholder="搜尋台本名稱或作者…"
                          className="h-10 w-full rounded-lg border border-border/70 bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15"
                        />
                        {targetPickerOpen && (
                          <div id="demo-submission-target-options" role="listbox" className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-20 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-xl">
                            {visibleTargets.length === 0 ? <p className="px-3 py-4 text-sm text-muted-foreground">找不到符合的台本。</p> : visibleTargets.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={target === option.value}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => { setTarget(option.value); setTargetSearch(""); setTargetPickerOpen(false); }}
                                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-muted/70 aria-selected:bg-muted"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm">{option.title}</span>
                      {option.authorName && <span className="block truncate text-xs text-muted-foreground">台本師：{option.authorName}</span>}
                                </span>
                                <span className="shrink-0 text-[10px] text-muted-foreground">{option.type === "external" ? "外部" : "本站"}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {target && <input type="hidden" name="target" value={target} />}
                    </label>

                    <label className="grid gap-1 text-sm">Demo 名稱
                      <input name="demoName" maxLength={160} placeholder="例如：角色 A 試聽" className="h-10 rounded-lg border border-border/70 bg-background px-3" />
                    </label>
                    <fieldset className="grid gap-1 text-sm">
                      <legend>聲演聲線（可複選）</legend>
                      <div className="flex h-10 items-center gap-4 rounded-lg border border-border/70 bg-background px-3">
                        <label className="inline-flex items-center gap-2 text-xs">
                          <input type="checkbox" name="voiceTypes" value="male" checked={voiceTypes.includes("male")} onChange={(event) => setVoiceTypes((current) => event.target.checked ? [...new Set<"male" | "female">([...current, "male"])] : current.filter((type) => type !== "male"))} className="accent-primary" />
                          男聲演
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs">
                          <input type="checkbox" name="voiceTypes" value="female" checked={voiceTypes.includes("female")} onChange={(event) => setVoiceTypes((current) => event.target.checked ? [...new Set<"male" | "female">([...current, "female"])] : current.filter((type) => type !== "female"))} className="accent-primary" />
                          女聲演
                        </label>
                      </div>
                    </fieldset>
                    <div className="grid gap-1 text-sm">
                      <span>聲演名單 <span className="text-destructive">必填</span></span>
                      <input
                        value={voiceActorQuery}
                        onChange={(event) => setVoiceActorQuery(event.target.value)}
                        placeholder="搜尋公開聲演身份…"
                        className="h-10 rounded-lg border border-border/70 bg-background px-3"
                        aria-label="搜尋聲演名單"
                      />
                    </div>

                    <div id="demo-submission-voice-actors" className={`rounded-lg border bg-card/40 p-2.5 sm:col-span-2 ${voiceActorError ? "border-destructive/70" : "border-border/70"}`} aria-invalid={Boolean(voiceActorError)} aria-describedby={voiceActorError ? "demo-submission-voice-actor-error" : undefined}>
                      {selectedVoiceActors.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          {selectedVoiceActors.map((persona) => (
                            <button key={persona.id} type="button" onClick={() => toggleVoiceActor(persona.id)} className="rounded-full bg-primary/15 px-2.5 py-1 text-xs text-primary hover:bg-primary/25">
                              {persona.displayName} <span aria-hidden>×</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {visibleVoiceActors.length > 0 ? (
                        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
                          {visibleVoiceActors.map((persona) => {
                            const selected = voiceActorIds.includes(persona.id);
                            return (
                              <button key={persona.id} type="button" aria-pressed={selected} onClick={() => toggleVoiceActor(persona.id)} className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${selected ? "border-primary/50 bg-primary/15 text-primary" : "border-border/70 bg-background hover:bg-muted"}`}>
                                {selected ? "✓ " : ""}{persona.displayName}
                              </button>
                            );
                          })}
                        </div>
                      ) : <p className="px-1 py-2 text-xs text-muted-foreground">目前沒有符合的公開聲演身份；其他演出者可填在下方。</p>}
                      <p className="mt-2 px-1 text-[11px] text-muted-foreground">名單包含自填聲演身份，或已有公開 Demo 演出紀錄的身份頁。</p>
                    </div>

                    <section className="rounded-lg border border-border/70 bg-card/40 p-3 sm:col-span-2" aria-label="新增名單外聲演">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-medium">名單外聲演</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">審核通過後會建立身份頁並連上這筆 Demo。</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setManualVoiceActors((current) => [...current, { id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: "", socialUrl: "" }])}
                          disabled={manualVoiceActors.length >= 20}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border/70 px-2.5 py-1.5 text-xs font-medium hover:bg-muted/60 disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />新增聲演
                        </button>
                      </div>
                      {manualVoiceActors.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {manualVoiceActors.map((actor, index) => (
                            <div key={actor.id} className="grid gap-2 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
                              <label className="grid gap-1 text-xs text-muted-foreground">
                                <span>姓名</span>
                                <input
                                  value={actor.name}
                                  onChange={(event) => {
                                    const name = event.target.value;
                                    setManualVoiceActors((current) => current.map((item) => item.id === actor.id ? { ...item, name } : item));
                                    if (name.trim() || selectedVoiceActors.length > 0) setVoiceActorError("");
                                  }}
                                  maxLength={120}
                                  placeholder="聲演名稱"
                                  aria-label={`名單外聲演 ${index + 1} 姓名`}
                                  className="h-9 rounded-md border border-border/70 bg-background px-2.5 text-sm text-foreground"
                                />
                              </label>
                              <label className="grid gap-1 text-xs text-muted-foreground">
                                <span>社群連結（選填）</span>
                                <input
                                  value={actor.socialUrl}
                                  onChange={(event) => setManualVoiceActors((current) => current.map((item) => item.id === actor.id ? { ...item, socialUrl: event.target.value } : item))}
                                  type="url"
                                  pattern="https://.*"
                                  maxLength={2000}
                                  placeholder="https://…"
                                  aria-label={`名單外聲演 ${index + 1} 社群連結`}
                                  className="h-9 rounded-md border border-border/70 bg-background px-2.5 text-sm text-foreground"
                                />
                              </label>
                              <button type="button" onClick={() => {
                                const next = manualVoiceActors.filter((item) => item.id !== actor.id);
                                setManualVoiceActors(next);
                                if (selectedVoiceActors.length > 0 || next.some((item) => item.name.trim())) setVoiceActorError("");
                              }} aria-label={`移除名單外聲演 ${index + 1}`} className="mt-auto inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                                <X className="h-4 w-4" aria-hidden />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : <p className="mt-3 text-xs text-muted-foreground">尚未新增名單外聲演。</p>}
                      {voiceActorError && <p id="demo-submission-voice-actor-error" role="alert" className="mt-2 text-xs font-medium text-destructive">{voiceActorError}</p>}
                    </section>
                    <label className="grid gap-1 text-sm sm:col-span-2">公開 Demo 連結
                      <input name="demoUrl" type="url" required pattern="https://.*" maxLength={2000} placeholder="https://…" className="h-10 rounded-lg border border-border/70 bg-background px-3" />
                    </label>
                    <label className="grid gap-1 text-sm sm:col-span-2">封面圖片連結（選填）
                      <input name="coverUrl" type="url" pattern="https://.*" maxLength={2000} placeholder="非 YouTube 來源可補充封面圖片網址" className="h-10 rounded-lg border border-border/70 bg-background px-3" />
                    </label>
                    <label className="grid gap-1 text-sm">投稿者名稱（公開顯示）
                      <input name="displayName" maxLength={120} placeholder="可留空" className="h-10 rounded-lg border border-border/70 bg-background px-3" />
                    </label>
                    <label className="grid gap-1 text-sm">聯絡 Email（不公開）
                      <input name="contactEmail" type="email" maxLength={320} placeholder="可留空" className="h-10 rounded-lg border border-border/70 bg-background px-3" />
                    </label>
                    <label className="grid gap-1 text-sm sm:col-span-2">簡介
                      <textarea name="description" rows={3} maxLength={2000} placeholder="補充角色、版本或演出資訊" className="rounded-lg border border-border/70 bg-background px-3 py-2" />
                    </label>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
                      <input name="confirmPublic" type="checkbox" required className="mt-0.5 accent-primary" />
                      <span>我確認此 Demo 連結可公開瀏覽，且我有權提供此連結供本站展示。</span>
                    </label>
                    {manualVoiceActors.some((actor) => actor.name.trim()) && (
                      <label className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2">
                        <input name="confirmVoiceActorProfiles" type="checkbox" required className="mt-0.5 accent-primary" />
                        <span>我已取得名單外聲演同意，將以其姓名與社群連結建立公開聲演身份頁。</span>
                      </label>
                    )}
                    <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px" />
                    <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                      <button type="submit" disabled={isSubmitting || submissionTargets.length === 0} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                        {isSubmitting ? "送出中…" : "送出審核"}
                      </button>
                      {submissionTargets.length === 0 && <span className="text-xs text-muted-foreground">目前沒有可投稿的公開台本。</span>}
                      {submitError && <span role="alert" className="text-sm text-destructive">{submitError}</span>}
                    </div>
                  </form>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </div>

        {scriptGroups.length === 0 ? (
          <PublicEmptyState
            className="rounded-xl border border-dashed border-border/70 bg-card/40"
            title="目前還沒有公開 Demo"
            description="台本與對應的範例會在審核後出現在這裡。你也可以成為第一位投稿的人。"
            primaryAction={{ label: "投稿 Demo", onClick: () => setShowSubmissionForm(true) }}
            secondaryAction={{ label: "瀏覽公開台本", href: "/" }}
          />
        ) : !selectedGroup ? (
          visibleGroups.length === 0 ? (
            <PublicEmptyState
              className="rounded-xl border border-dashed border-border/70 bg-card/40"
              title="找不到符合的台本或 Demo"
              description="換個關鍵字試試，或清除搜尋看看全部。"
              primaryAction={{ label: "清除搜尋", onClick: () => setQuery("") }}
              secondaryAction={{ label: "投稿 Demo", onClick: () => setShowSubmissionForm(true) }}
            />
          ) : (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">台本</h2>
                <span className="text-xs text-muted-foreground">{visibleGroups.length} 部</span>
              </div>
              <div className="space-y-3">
                {visibleGroups.map((group) => {
                  const demoCoverUrl = group.demos
                    .map((demo) => youtubeThumbnail(demo.url))
                    .find(Boolean) || group.coverUrl || "";
                  return (
                    <article key={group.key} className="grid min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/40 lg:grid-cols-[minmax(17rem,0.34fr)_minmax(0,0.66fr)]">
                      <div className="grid min-h-28 min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] border-b border-border/70 lg:min-h-0 lg:grid-cols-[minmax(7rem,0.36fr)_minmax(0,0.64fr)] lg:border-b-0 lg:border-r">
                        <button type="button" onClick={() => openScript(group.key)} aria-label={`查看台本「${group.title}」`} className="group relative min-h-full overflow-hidden bg-muted/40 text-left">
                          <BookOpen className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground/50" aria-hidden />
                          {demoCoverUrl && <PublicImage src={demoCoverUrl} alt={group.coverUrl ? `${group.title}封面` : `${group.title} YouTube Demo 封面`} preset="script-cover" className="transition-transform duration-300 group-hover:scale-[1.03]" />}
                        </button>
                        <div className="flex min-w-0 flex-col justify-center p-3 sm:p-4">
                          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">{group.scriptType === "external" ? "外部台本" : "本站台本"}</span>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{group.demos.length} 筆 Demo</span>
                          </div>
                          <button type="button" onClick={() => openScript(group.key)} className="line-clamp-2 text-left text-sm font-semibold leading-snug hover:text-primary">{group.title}</button>
                          {group.authorName && <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground"><span className="truncate">台本師：{group.authorName}</span><span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">台本師</span>{voiceActorNames.has(group.authorName.trim().toLocaleLowerCase()) && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">聲演</span>}</span>}
                          <button type="button" onClick={() => openScript(group.key)} className="mt-2 inline-flex min-h-8 w-fit items-center gap-1 text-[11px] font-semibold text-primary">台本資訊 <ExternalLink className="h-3 w-3" aria-hidden /></button>
                        </div>
                      </div>

                      <section aria-label={`${group.title}的演出版本`} className="min-w-0">
                        <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border/70 px-3">
                          <h3 className="text-xs font-semibold">演出與試聽</h3>
                          <span className="text-[10px] text-muted-foreground">{group.demos.length} 筆 Demo</span>
                        </div>
                        <div className="divide-y divide-border/60" aria-label="Demo 清單">
                          {group.demos.map((demo, index) => {
                            const actors = demoActors(demo, voiceActorById);
                            const names = [...new Set([...actors.map((actor) => actor.displayName.trim()), ...demoCastNames(demo)])];
                            const actorHrefs = new Map<string, string>();
                            actors.forEach((actor) => actorHrefs.set(actor.displayName.trim(), actor.externalHref || `/author/${encodeURIComponent(actor.id)}`));
                            demo.manualVoiceActors.forEach((actor) => {
                              const href = actor.personaId ? `/author/${encodeURIComponent(actor.personaId)}` : actor.socialUrl;
                              if (href) actorHrefs.set(actor.name.trim(), href);
                            });
                            const demoTitle = demo.name && !GENERIC_DEMO_NAME_PATTERN.test(demo.name)
                              ? demo.name
                              : `演出版本 ${index + 1}`;
                            const previewImage = youtubeThumbnail(demo.url) || demo.coverUrl;
                            return (
                              <div key={`${demo.id}-${index}`} className="grid min-h-[4.25rem] grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 hover:bg-muted/50 sm:grid-cols-[6rem_minmax(0,1fr)_auto]">
                                <a href={demo.url} target="_blank" rel="noopener noreferrer" aria-label={`播放 ${demoTitle}`} className="relative aspect-video overflow-hidden rounded-md bg-muted/70">
                                  {previewImage ? <PublicImage src={previewImage} alt={`${demoTitle}預覽`} preset="thumbnail" /> : <Play className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" aria-hidden />}
                                </a>
                                <span className="min-w-0 flex-1">
                                  <a href={demo.url} target="_blank" rel="noopener noreferrer" aria-label={`開啟 ${demoTitle} 的 Demo`} className="block truncate text-xs font-medium leading-5 hover:text-primary">{demoTitle}</a>
                                  <span className="flex min-w-0 items-center gap-1 truncate text-[10px] leading-4 text-muted-foreground">
                                    <span className="shrink-0">聲演：</span>
                                    {names.length > 0 ? names.map((name, nameIndex) => {
                                      const href = actorHrefs.get(name);
                                      const alsoAuthor = Boolean(group.authorName && name.toLocaleLowerCase() === group.authorName.trim().toLocaleLowerCase());
                                      return (
                                        <span key={`${name}-${nameIndex}`} className="inline-flex min-w-0 items-center gap-0.5">
                                          {nameIndex > 0 && <span aria-hidden>、</span>}
                                          {href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="truncate underline-offset-2 hover:text-primary hover:underline">{name}</a> : <span className="truncate">{name}</span>}
                                          {alsoAuthor && <span className="shrink-0 rounded bg-primary/10 px-1 text-[9px] text-primary">台本師</span>}
                                        </span>
                                      );
                                    }) : <span>資料未標示</span>}
                                    {demo.voiceTypes.map((type) => <span key={type} className="ml-1 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{type === "male" ? "男聲演" : "女聲演"}</span>)}
                                    <span className="ml-1 shrink-0">· {demoPlatform(demo.url)}</span>
                                  </span>
                                </span>
                                <a href={demo.url} target="_blank" rel="noopener noreferrer" aria-label={`試聽 ${demoTitle}`} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-primary/10 px-2 text-[10px] font-semibold text-primary hover:bg-primary/15">
                                  <Play className="h-3 w-3 fill-current" aria-hidden />試聽
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </article>
                  );
                })}
              </div>
            </section>
          )
        ) : (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-border/70 bg-card/40">
              <div className="grid gap-4 p-4 sm:grid-cols-[minmax(12rem,0.36fr)_minmax(0,1fr)] sm:items-center sm:p-5">
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted/40">
                  <BookOpen className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                  {selectedGroupCoverUrl && <PublicImage src={selectedGroupCoverUrl} alt={`${selectedGroup.title}封面`} preset="script-cover" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">{selectedGroup.scriptType === "external" ? "外部台本" : "本站台本"}</span>
                    <span className="text-xs text-muted-foreground">{selectedGroup.demos.length} 筆公開 Demo</span>
                  </div>
                  {selectedGroup.authorName && <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"><span>台本師：{selectedGroup.authorName}</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">台本師</span>{voiceActorNames.has(selectedGroup.authorName.trim().toLocaleLowerCase()) && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">聲演</span>}</p>}
                  {selectedGroup.summary && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{selectedGroup.summary}</p>}
                  <a href={selectedGroup.sourceUrl} target={selectedGroup.scriptType === "external" ? "_blank" : undefined} rel={selectedGroup.scriptType === "external" ? "noopener noreferrer" : undefined} className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border/70 px-3 py-2 text-xs font-medium hover:bg-muted/60">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden />{selectedGroup.scriptType === "external" ? "閱讀原台本" : "閱讀台本"}<ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold">演出與試聽</h2>
                <span className="text-xs text-muted-foreground">{selectedGroup.demos.length} 筆</span>
              </div>
              <div className={selectedGroup.demos.length > 1 ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
                {selectedGroup.demos.map((demo, index) => {
                  const actors = demo.voiceActorIds.map((id) => voiceActorById.get(id)).filter((persona): persona is PublicPersona => Boolean(persona));
                  const artwork = youtubeThumbnail(demo.url) || selectedGroup.coverUrl || demo.coverUrl;
                  const singleDemo = selectedGroup.demos.length === 1;
                  return (
                    <article key={`${demo.id}-${index}`} className={`overflow-hidden rounded-xl border border-border/70 bg-card/40 ${singleDemo ? "sm:grid sm:grid-cols-[minmax(14rem,0.42fr)_minmax(0,1fr)]" : ""}`}>
                      <a href={demo.url} target="_blank" rel="noopener noreferrer" aria-label={`開啟 ${demo.name || "演出 Demo"}`} className={`group relative block overflow-hidden bg-muted/40 ${singleDemo ? "aspect-video sm:aspect-auto sm:min-h-64" : "aspect-video"}`}>
                        <BookOpen className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                        {artwork && <PublicImage src={artwork} alt={`${demo.name || "演出 Demo"}封面`} preset="script-cover" className="transition-transform duration-300 group-hover:scale-[1.03]" />}
                        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">播放連結 <ExternalLink className="h-3 w-3" aria-hidden /></span>
                      </a>
                      <div className="flex min-w-0 flex-col p-4">
                        <h3 className="text-base font-semibold">{demo.name || "演出 Demo"}</h3>
                        {actors.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {actors.map((persona) => (
                              <a key={persona.id} href={persona.externalHref || `/author/${encodeURIComponent(persona.id)}`} className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 py-1 pl-1 pr-3 text-xs hover:border-primary/40 hover:text-primary">
                                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
                                  {persona.avatar ? <PublicImage src={persona.avatar} alt="" preset="avatar" sizes="28px" /> : <span className="flex h-full items-center justify-center text-[10px]">{persona.displayName.slice(0, 1)}</span>}
                                </span>
                                <span>
                                  <span className="block font-medium">{persona.displayName}</span>
                                  <span className="block text-[10px] text-muted-foreground">{(persona.tags || []).find((tag) => VOICE_ACTOR_TAG_PATTERN.test(tag)) || "聲演"}</span>
                                </span>
                              </a>
                            ))}
                          </div>
                        )}
                        {demo.manualVoiceActors.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-1.5 text-xs text-muted-foreground">名單外聲演</p>
                            <div className="flex flex-wrap gap-2">
                              {demo.manualVoiceActors.map((actor, actorIndex) => (
                                <span key={`${actor.name}-${actorIndex}`} className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs">
                                  {actor.personaId ? <a href={`/author/${encodeURIComponent(actor.personaId)}`} className="font-medium hover:text-primary">{actor.name}</a> : <span>{actor.name}</span>}
                                  {actor.socialUrl && <a href={actor.socialUrl} target="_blank" rel="noopener noreferrer" aria-label={`${actor.name}社群連結`} className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3 w-3" aria-hidden /></a>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {demoLegacyCastNames(demo).length > 0 && <p className="mt-2 text-xs text-muted-foreground">聲演：{demoLegacyCastNames(demo).join("、")}</p>}
                        {demo.voiceTypes.length > 0 && <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">聲演聲線：{demo.voiceTypes.map((type) => <span key={type} className="rounded-full bg-muted px-2 py-0.5">{type === "male" ? "男聲演" : "女聲演"}</span>)}</p>}
                        {demo.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{demo.description}</p>}
                        <a href={demo.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20">
                          開啟 Demo <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
