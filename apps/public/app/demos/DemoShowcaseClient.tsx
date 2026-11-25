"use client";

import { PublicSubmissionDialogContent } from "@/components/PublicSubmissionDialogContent";
import { PublicSearchField } from "@/components/PublicSearchField";
import { PublicSubmissionTrigger } from "@/components/PublicSubmissionTrigger";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpen, Check, ExternalLink, LayoutGrid, List, LoaderCircle, Play, Plus, RefreshCw, Search, X } from "lucide-react";
import { AnimatedSegment } from "@/components/AnimatedSegment";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { PublicBackButton } from "@/components/PublicBackButton";
import { PublicMorphDropdown } from "@/components/PublicMorphDropdown";
import { PublicImage } from "@/components/PublicImage";
import { LiveBannerStrip } from "@/components/LiveBannerStrip";
import type { HeroSlide } from "@write/public-ui";
import { liveApi } from "@/lib/liveApi";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { demoArtwork } from "@/lib/demoArtwork";
import type { PublicPersona } from "@/lib/types";
import type { DemoCatalog, DemoCatalogBundle, DemoLink, DemoScriptGroup, ManualVoiceActor } from "@/lib/demoCatalog";
import { DEMO_CATALOG_SECTIONS } from "@/lib/publicBundleProjection";
import { useDirectoryRenderLimit } from "@/lib/useDirectoryRenderLimit";

interface ManualVoiceActorDraft extends ManualVoiceActor {
  id: string;
}

type DemoSort = "newest" | "oldest" | "random";
type DemoView = "grid" | "list";

const DEMO_SORT_OPTIONS: { value: DemoSort; label: string }[] = [
  { value: "newest", label: "最新" },
  { value: "oldest", label: "最舊" },
  { value: "random", label: "隨機" },
];
const DEMO_SORT_GROUPS = [{ options: DEMO_SORT_OPTIONS }];
const DEMO_VIEW_OPTIONS: { value: DemoView; label: string }[] = [
  { value: "grid", label: "卡片模式" },
  { value: "list", label: "橫條模式" },
];

function randomRank(key: string, seed: number): number {
  let hash = seed | 0;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

interface Props {
  initialCatalog: DemoCatalog;
  initialBannerSlides?: HeroSlide[];
  refreshOnMount: boolean;
}

function DemoAuthorName({ group }: { group: DemoScriptGroup }) {
  return group.authorHref
    ? <a href={group.authorHref} className="inline-flex min-h-7 items-center text-link hover:underline">{group.authorName}</a>
    : <span>{group.authorName}</span>;
}

const VOICE_ACTOR_TAG_PATTERN = /聲演|配音|voice[\s-]?actor/i;
const GENERIC_DEMO_NAME_PATTERN = /^(演出 demo|demo|試聽|google docs|youtube|vocus|cxc|soundcloud|bilibili|spotify)$/i;

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

export function DemoShowcaseClient({ initialCatalog, initialBannerSlides, refreshOnMount }: Props) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const { groups: scriptGroups, personas, submissionTargets } = catalog;
  const [liveBundleLoaded, setLiveBundleLoaded] = useState(!refreshOnMount);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<DemoSort>("newest");
  const [view, setView] = useState<DemoView>("grid");
  const [randomSeed, setRandomSeed] = useState(0);
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
    if (!refreshOnMount) return;
    let active = true;
    void Promise.all([
      readPublicBundle<DemoCatalogBundle>(DEMO_CATALOG_SECTIONS),
      import("@/lib/demoCatalog"),
    ]).then(([{ data }, { buildDemoCatalog }]) => {
      if (active) setCatalog(buildDemoCatalog(data));
    }).catch(() => {}).finally(() => { if (active) setLiveBundleLoaded(true); });
    return () => { active = false; };
  }, [refreshOnMount]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleGroups = useMemo(() => {
    const filtered = normalizedQuery ? scriptGroups.filter((group) => [
      group.title,
      group.authorName,
      group.summary,
      ...group.demos.flatMap((demo) => [demo.name, demo.cast, demo.description, ...demo.manualVoiceActors.map((actor) => actor.name)]),
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery))) : scriptGroups;
    return [...filtered].sort((a, b) => {
      if (sort === "random") return randomRank(a.key, randomSeed) - randomRank(b.key, randomSeed) || a.key.localeCompare(b.key);
      return (sort === "newest" ? b.sortAt - a.sortAt : a.sortAt - b.sortAt)
        || a.title.localeCompare(b.title, "zh-Hant");
    });
  }, [scriptGroups, normalizedQuery, sort, randomSeed]);

  const changeSort = (next: DemoSort) => {
    if (next === "random") setRandomSeed(Date.now());
    setSort(next);
  };

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
    ? selectedGroup.demos.map((demo) => demoArtwork(demo.url, demo.coverUrl)).find(Boolean) || selectedGroup.coverUrl
    : "";
  const { limit: renderLimit, loadMoreRef } = useDirectoryRenderLimit(
    selectedGroup ? 0 : visibleGroups.length,
    8,
    JSON.stringify([normalizedQuery, sort, randomSeed, view]),
  );
  const voiceActorById = useMemo(() => new Map<string, PublicPersona>(personas.map((persona) => [persona.id, persona])), [personas]);
  const voiceActors = useMemo(() => catalog.voiceActorIds.flatMap((id) => {
    const persona = voiceActorById.get(id);
    return persona ? [persona] : [];
  }), [catalog.voiceActorIds, voiceActorById]);
  const voiceActorNames = useMemo(() => new Set(voiceActors.map((persona) => persona.displayName.trim().toLocaleLowerCase())), [voiceActors]);
  const selectedGroupAuthorIsVoiceActor = selectedGroup && voiceActorNames.has(selectedGroup.authorName.trim().toLocaleLowerCase());
  const selectedVoiceActors = voiceActorIds.map((id) => voiceActorById.get(id)).filter((persona): persona is PublicPersona => Boolean(persona));
  const visibleVoiceActors = showSubmissionForm ? voiceActors
    .filter((persona) => `${persona.displayName} ${(persona.tags || []).join(" ")}`.toLocaleLowerCase().includes(voiceActorQuery.trim().toLocaleLowerCase()))
    .slice(0, 20) : [];

  const selectedTarget = submissionTargets.find((option) => option.value === target);
  const visibleTargets = showSubmissionForm && targetPickerOpen ? submissionTargets
    .filter((option) => `${option.label} ${option.authorName}`.toLocaleLowerCase().includes(targetSearch.trim().toLocaleLowerCase()))
    .slice(0, 25) : [];

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
    window.requestAnimationFrame(() => document.querySelector("main")?.scrollIntoView({ block: "start" }));
  };

  const returnToScriptList = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("script");
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedScriptKey("");
    window.requestAnimationFrame(() => document.querySelector("main")?.scrollIntoView({ block: "start" }));
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
    <div className="flex flex-1 flex-col bg-background">
      <LiveBannerStrip slides={initialBannerSlides} placement="demos" />
      {submitMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-4 left-4 right-4 z-[60] mx-auto flex max-w-lg items-start gap-3 rounded-xl border border-success bg-background px-4 py-3 text-sm text-foreground shadow-lg sm:left-auto sm:right-6">
          <Check className="public-motion-icon h-4 w-4 shrink-0 text-success" aria-hidden />
          <span className="min-w-0 flex-1">{submitMessage}</span>
          <button type="button" onClick={() => setSubmitMessage("")} aria-label="關閉通知" className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      <PublicBrowseMain>
        <PublicBrowseHeader
          title={selectedGroup?.title ?? "Demo"}
          leading={selectedGroup && <PublicBackButton label="返回台本清單" onClick={returnToScriptList} />}
          description={selectedGroup?.authorName && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>台本師：<DemoAuthorName group={selectedGroup} /></span>
              <span className="rounded-sm bg-muted px-1.5 py-0.5 [font-size:var(--public-font-caption)]">台本師</span>
              {selectedGroupAuthorIsVoiceActor && (
                <span className="rounded-sm bg-muted px-1.5 py-0.5 [font-size:var(--public-font-caption)] text-link">聲演</span>
              )}
            </p>
          )}
          search={!selectedGroup && (
            <PublicSearchField
              value={query}
              onChange={setQuery}
              placeholder="搜尋台本或台本師"
            />
          )}
          actions={
            <Dialog.Root open={showSubmissionForm} onOpenChange={setShowSubmissionForm}>
              <Dialog.Trigger asChild>
                <PublicSubmissionTrigger label="投稿 Demo" />
              </Dialog.Trigger>
              <PublicSubmissionDialogContent title="投稿已錄製的 Demo" description="選擇台本並提供公開連結，審核通過後會顯示在該台本旁。" width="large" restoreActiveElement>
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
                        className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-link"
                      />
                      {targetPickerOpen && (
                        <div id="demo-submission-target-options" role="listbox" className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-20 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
                          {visibleTargets.length === 0 ? <p className="px-3 py-4 text-sm text-muted-foreground">找不到符合的台本。</p> : visibleTargets.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              role="option"
                              aria-selected={target === option.value}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => { setTarget(option.value); setTargetSearch(""); setTargetPickerOpen(false); }}
                              className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-muted aria-selected:bg-muted"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm">{option.title}</span>
                    {option.authorName && <span className="block truncate text-xs text-muted-foreground">台本師：{option.authorName}</span>}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {target && <input type="hidden" name="target" value={target} />}
                  </label>

                  <label className="grid gap-1 text-sm">Demo 名稱
                    <input name="demoName" maxLength={160} placeholder="例如：角色 A 試聽" className="h-10 rounded-lg border border-border bg-background px-3" />
                  </label>
                  <fieldset className="grid gap-1 text-sm">
                    <legend>聲演聲線（可複選）</legend>
                    <div className="flex h-10 items-center gap-4 rounded-lg border border-border bg-background px-3">
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
                      className="h-10 rounded-lg border border-border bg-background px-3"
                      aria-label="搜尋聲演名單"
                    />
                  </div>

                  <div id="demo-submission-voice-actors" className={`rounded-lg border bg-card p-2.5 sm:col-span-2 ${voiceActorError ? "border-destructive/70" : "border-border"}`} aria-invalid={Boolean(voiceActorError)} aria-describedby={voiceActorError ? "demo-submission-voice-actor-error" : undefined}>
                    {selectedVoiceActors.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {selectedVoiceActors.map((persona) => (
                          <button key={persona.id} type="button" onClick={() => toggleVoiceActor(persona.id)} className="rounded-sm bg-muted px-2 py-1 text-xs text-foreground hover:bg-border">
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
                            <button key={persona.id} type="button" aria-pressed={selected} onClick={() => toggleVoiceActor(persona.id)} className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted"}`}>
                              {selected ? "✓ " : ""}{persona.displayName}
                            </button>
                          );
                        })}
                      </div>
                    ) : <p className="px-1 py-2 text-xs text-muted-foreground">目前沒有符合的公開聲演身份；其他演出者可填在下方。</p>}
                    <p className="mt-2 px-1 [font-size:var(--public-font-caption)] text-muted-foreground">名單包含自填聲演身份，或已有公開 Demo 演出紀錄的身份頁。</p>
                  </div>

                  <section className="rounded-lg border border-border bg-card p-3 sm:col-span-2" aria-label="新增名單外聲演">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-medium">名單外聲演</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">審核通過後會建立身份頁並連上這筆 Demo。</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setManualVoiceActors((current) => [...current, { id: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: "", socialUrl: "" }])}
                        disabled={manualVoiceActors.length >= 20}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
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
                                className="h-9 rounded-md border border-border bg-background px-2.5 text-sm text-foreground"
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
                                className="h-9 rounded-md border border-border bg-background px-2.5 text-sm text-foreground"
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
                    <input name="demoUrl" type="url" required pattern="https://.*" maxLength={2000} placeholder="https://…" className="h-10 rounded-lg border border-border bg-background px-3" />
                  </label>
                  <label className="grid gap-1 text-sm sm:col-span-2">封面圖片連結（選填）
                    <input name="coverUrl" type="url" pattern="https://.*" maxLength={2000} placeholder="非 YouTube 來源可補充封面圖片網址" className="h-10 rounded-lg border border-border bg-background px-3" />
                  </label>
                  <label className="grid gap-1 text-sm">投稿者名稱（公開顯示）
                    <input name="displayName" maxLength={120} placeholder="可留空" className="h-10 rounded-lg border border-border bg-background px-3" />
                  </label>
                  <label className="grid gap-1 text-sm">聯絡 Email（不公開）
                    <input name="contactEmail" type="email" maxLength={320} placeholder="可留空" className="h-10 rounded-lg border border-border bg-background px-3" />
                  </label>
                  <label className="grid gap-1 text-sm sm:col-span-2">簡介
                    <textarea name="description" rows={3} maxLength={2000} placeholder="補充角色、版本或演出資訊" className="rounded-lg border border-border bg-background px-3 py-2" />
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
                    <span role="status" className="sr-only">{isSubmitting ? "送出中…" : ""}</span>
                    <button type="submit" disabled={isSubmitting || submissionTargets.length === 0} className="inline-flex min-w-28 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                      {isSubmitting && <LoaderCircle className="public-submit-spinner h-4 w-4" aria-hidden />}
                      <span key={String(isSubmitting)} className="public-motion-icon">{isSubmitting ? "送出中…" : "送出審核"}</span>
                    </button>
                    {submissionTargets.length === 0 && <span className="text-xs text-muted-foreground">目前沒有可投稿的公開台本。</span>}
                    {submitError && <span role="alert" className="text-sm text-destructive">{submitError}</span>}
                  </div>
                </form>
              </PublicSubmissionDialogContent>
            </Dialog.Root>
          }
        />

        {!selectedGroup && scriptGroups.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
            <span className="hidden [font-size:var(--public-font-meta)] text-muted-foreground sm:inline" aria-live="polite">{visibleGroups.length} 部 Demo 台本</span>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <PublicMorphDropdown label="Demo 排序" value={sort} groups={DEMO_SORT_GROUPS} onChange={changeSort} className="sm:hidden" align="end" />
              <AnimatedSegment label="Demo 排序" options={DEMO_SORT_OPTIONS} value={sort} onChange={changeSort}
                className="hidden h-9 border border-border sm:flex" btnClassName="whitespace-nowrap px-3 font-medium" />
              {sort === "random" && <button type="button" onClick={() => setRandomSeed(Date.now())} aria-label="重新隨機排序" title="重新隨機排序" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" aria-hidden /></button>}
              <AnimatedSegment label="展示方式" options={DEMO_VIEW_OPTIONS} value={view} onChange={setView}
                className="flex h-9 border border-border" btnClassName="inline-flex items-center gap-1 whitespace-nowrap px-2"
                renderOption={({ value, label }) => {
                  const Icon = value === "grid" ? LayoutGrid : List;
                  return <>
                    <Icon className="h-4 w-4" aria-hidden />
                    <span className="sr-only">{label}</span>
                    <span className="hidden md:inline" aria-hidden>{value === "grid" ? "卡片" : "橫條"}</span>
                  </>;
                }} />
            </div>
          </div>
        )}

        {scriptGroups.length === 0 ? (
          <PublicEmptyState
            className="border-y border-border"
            title="目前還沒有公開 Demo"
            description="台本與對應的範例會在審核後出現在這裡。你也可以成為第一位投稿的人。"
            primaryAction={{ label: "投稿 Demo", onClick: () => setShowSubmissionForm(true) }}
            secondaryAction={{ label: "瀏覽公開台本", href: "/" }}
          />
        ) : !selectedGroup ? (
          visibleGroups.length === 0 ? (
            <PublicEmptyState
              className="border-y border-border"
              title="找不到符合的台本或 Demo"
              description="換個關鍵字試試，或清除搜尋看看全部。"
              primaryAction={{ label: "清除搜尋", onClick: () => setQuery("") }}
              secondaryAction={{ label: "投稿 Demo", onClick: () => setShowSubmissionForm(true) }}
            />
          ) : (
            <section aria-label="Demo 作品">
              <div data-demo-view={view} className={view === "list" ? "grid grid-cols-1 gap-2.5" : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3"}>
                {visibleGroups.slice(0, renderLimit).map((group) => {
                  const firstDemo = group.demos[0];
                  const artwork = demoArtwork(firstDemo.url, firstDemo.coverUrl, group.coverUrl);
                  const actors = demoActors(firstDemo, voiceActorById);
                  const names = [...new Set([...actors.map((actor) => actor.displayName.trim()), ...demoCastNames(firstDemo)])];
                  const actorHrefs = new Map(actors.map((actor) => [actor.displayName.trim(), actor.externalHref || `/author/${encodeURIComponent(actor.id)}`]));
                  firstDemo.manualVoiceActors.forEach((actor) => {
                    const href = actor.personaId ? `/author/${encodeURIComponent(actor.personaId)}` : actor.socialUrl;
                    if (href) actorHrefs.set(actor.name.trim(), href);
                  });
                  const cardTitle = group.demos.find((demo) => demo.name.includes("｜") && /PV|試聽/.test(demo.name))?.name || group.title;
                  return (
                    <article key={group.key} className={`${view === "list" ? "grid grid-cols-[7rem_minmax(0,1fr)] sm:grid-cols-[12rem_minmax(0,1fr)]" : "flex flex-col"} min-w-0 overflow-hidden rounded-xl border border-border bg-card`}>
                      <button type="button" onClick={() => openScript(group.key)} aria-label={`查看台本「${group.title}」的演出版本`} className={`group relative overflow-hidden bg-muted text-left ${view === "list" ? "h-full min-h-28" : "aspect-video"}`}>
                        <BookOpen className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                        {artwork && <PublicImage src={artwork} alt={`${cardTitle}演出圖片`} preset="script-cover" className="group-hover:opacity-90" />}
                        {group.demos.length > 1 && <span className="absolute bottom-1.5 left-1.5 right-1.5 rounded-md bg-black/75 px-1 py-1 text-center [font-size:var(--public-font-caption)] text-white sm:bottom-2 sm:left-auto sm:right-2 sm:px-2 sm:text-xs">多個版本</span>}
                      </button>
                      <div className={`flex min-w-0 flex-1 flex-col p-2.5 ${view === "list" ? "sm:px-4 sm:py-3" : "sm:p-4"}`}>
                        <button type="button" onClick={() => openScript(group.key)} className={`text-left text-xs font-semibold leading-5 hover:text-link sm:text-sm ${view === "list" ? "line-clamp-1 sm:line-clamp-2" : "line-clamp-2 sm:min-h-10"}`}>{cardTitle}</button>
                        {group.authorName && <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><span className="shrink-0">台本師：</span><span className="min-w-0 truncate"><DemoAuthorName group={group} /></span></p>}
                        {group.organizationName && group.organizationHref && <p className="mt-1 truncate text-xs text-muted-foreground">組織：<a href={group.organizationHref} className="text-link hover:underline">{group.organizationName}</a></p>}
                        {names.length > 0 && <p className={`mt-1 flex min-w-0 items-center gap-x-1 text-xs text-muted-foreground ${view === "list" ? "overflow-hidden whitespace-nowrap" : "flex-wrap"}`}><span className="shrink-0">聲演：</span>{names.map((name, index) => {
                          const href = actorHrefs.get(name);
                          return <span key={`${name}-${index}`} className={`inline-flex min-w-0 items-center whitespace-nowrap rounded-md bg-muted px-1.5 ${view === "list" ? "truncate" : ""}`}>{href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} className="inline-flex min-h-7 items-center text-link hover:underline">{name}</a> : <span>{name}</span>}</span>;
                        })}</p>}
                        <div className={`mt-auto hidden pt-3 sm:block ${view === "list" ? "sm:pt-1" : ""}`}>
                          <button type="button" onClick={() => openScript(group.key)} className="inline-flex min-h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90">{group.demos.length > 1 ? "查看演出版本" : "查看演出"}</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              {visibleGroups.length > renderLimit && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
            </section>
          )
        ) : (
          <div className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="grid gap-4 p-4 sm:grid-cols-[minmax(12rem,0.36fr)_minmax(0,1fr)] sm:items-center sm:p-5">
                <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
                  <BookOpen className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                  {selectedGroupCoverUrl && <PublicImage src={selectedGroupCoverUrl} alt={`${selectedGroup.title}封面`} preset="script-cover" />}
                </div>
                <div className="min-w-0">
                  {selectedGroup.authorName && <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"><span>台本師：<DemoAuthorName group={selectedGroup} /></span><span className="rounded-sm bg-muted px-1.5 py-0.5 [font-size:var(--public-font-caption)]">台本師</span>{selectedGroupAuthorIsVoiceActor && <span className="rounded-sm bg-muted px-1.5 py-0.5 [font-size:var(--public-font-caption)] text-link">聲演</span>}</p>}
                  {selectedGroup.organizationName && selectedGroup.organizationHref && <p className="mt-1 text-sm text-muted-foreground">組織：<a href={selectedGroup.organizationHref} className="text-link hover:underline">{selectedGroup.organizationName}</a></p>}
                  {selectedGroup.summary && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{selectedGroup.summary}</p>}
                  <a href={selectedGroup.sourceUrl} target={selectedGroup.scriptType === "external" ? "_blank" : undefined} rel={selectedGroup.scriptType === "external" ? "noopener noreferrer" : undefined} className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted">
                    <BookOpen className="h-3.5 w-3.5" aria-hidden />{selectedGroup.scriptType === "external" ? "閱讀原台本" : "閱讀台本"}<ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold">演出與試聽</h2>
              </div>
              <div className={selectedGroup.demos.length > 1 ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
                {selectedGroup.demos.map((demo, index) => {
                  const actors = demo.voiceActorIds.map((id) => voiceActorById.get(id)).filter((persona): persona is PublicPersona => Boolean(persona));
                  const namedActors = new Set([...actors.map((actor) => actor.displayName), ...demo.manualVoiceActors.map((actor) => actor.name)].map((name) => name.trim().toLocaleLowerCase()));
                  const legacyCastNames = [...new Set(demoLegacyCastNames(demo))].filter((name) => !namedActors.has(name.toLocaleLowerCase()));
                  const artwork = demoArtwork(demo.url, demo.coverUrl, selectedGroup.coverUrl);
                  const singleDemo = selectedGroup.demos.length === 1;
                  return (
                    <article key={`${demo.id}-${index}`} className={`overflow-hidden rounded-xl border border-border bg-card ${singleDemo ? "sm:grid sm:grid-cols-[minmax(14rem,0.42fr)_minmax(0,1fr)]" : ""}`}>
                      <a href={demo.url} target="_blank" rel="noopener noreferrer" aria-label={`開啟 ${demo.name || "演出 Demo"}`} className={`group relative block overflow-hidden bg-muted ${singleDemo ? "aspect-video sm:aspect-auto sm:min-h-64" : "aspect-video"}`}>
                        <BookOpen className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                        {artwork && <PublicImage src={artwork} alt={`${demo.name || "演出 Demo"}封面`} preset="script-cover" className="group-hover:opacity-90" />}
                        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 [font-size:var(--public-font-caption)] font-semibold text-white">播放連結 <ExternalLink className="h-3 w-3" aria-hidden /></span>
                      </a>
                      <div className="flex min-w-0 flex-col p-4">
                        <h3 className="text-base font-semibold">{demo.name || "演出 Demo"}</h3>
                        {actors.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {actors.map((persona) => (
                              <a key={persona.id} href={persona.externalHref || `/author/${encodeURIComponent(persona.id)}`} className="inline-flex items-center gap-2 rounded-md border border-border bg-card py-1 pl-1 pr-3 text-xs hover:text-link">
                                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
                                  {persona.avatar ? <PublicImage src={persona.avatar} alt="" preset="avatar" sizes="28px" /> : <span className="flex h-full items-center justify-center [font-size:var(--public-font-caption)]">{persona.displayName.slice(0, 1)}</span>}
                                </span>
                                <span>
                                  <span className="block font-medium">{persona.displayName}</span>
                                  <span className="block [font-size:var(--public-font-caption)] text-muted-foreground">{(persona.tags || []).find((tag) => VOICE_ACTOR_TAG_PATTERN.test(tag)) || "聲演"}</span>
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
                                <span key={`${actor.name}-${actorIndex}`} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs">
                                  {actor.personaId ? <a href={`/author/${encodeURIComponent(actor.personaId)}`} className="font-medium hover:text-link">{actor.name}</a> : <span>{actor.name}</span>}
                                  {actor.socialUrl && <a href={actor.socialUrl} target="_blank" rel="noopener noreferrer" aria-label={`${actor.name}社群連結`} className="text-muted-foreground hover:text-link"><ExternalLink className="h-3 w-3" aria-hidden /></a>}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {legacyCastNames.length > 0 && <p className="mt-2 text-xs text-muted-foreground">聲演：{legacyCastNames.join("、")}</p>}
                        {demo.voiceTypes.length > 0 && <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">聲演聲線：{demo.voiceTypes.map((type) => <span key={type} className="rounded-sm bg-muted px-1.5 py-0.5">{type === "male" ? "男聲演" : "女聲演"}</span>)}</p>}
                        {demo.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{demo.description}</p>}
                        <a href={demo.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
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
      </PublicBrowseMain>
    </div>
  );
}
