"use client";

import { PublicSubmissionDialogContent } from "@/components/PublicSubmissionDialogContent";
import { PublicSearchField } from "@/components/PublicSearchField";
import { PublicSubmissionTrigger } from "@/components/PublicSubmissionTrigger";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { PublicActionArrow, PublicContentLink, PublicMetadataLabel, PublicPersonLink, PublicPlayLink } from "@/components/PublicDirectoryDetails";
import { BookOpen, Check, Headphones, LayoutGrid, List, LoaderCircle, Plus, RefreshCw, Search, X } from "lucide-react";
import { AnimatedSegment } from "@/components/AnimatedSegment";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { PublicBackButton } from "@/components/PublicBackButton";
import { PublicMorphDropdown } from "@/components/PublicMorphDropdown";
import { PublicCast, PublicVoiceTypes, PublicWorkDetails } from "@/components/PublicWorkDetails";
import { publicDemoPerformers } from "@/lib/publicWorkPerformers";
import { DemoArtworkImage } from "@/components/DemoArtworkImage";
import { LiveBannerStrip } from "@/components/LiveBannerStrip";
import type { HeroSlide } from "@write/public-ui";
import { demoDetailHref } from "@write/public-ui/demo-detail-href";
import { liveApi } from "@/lib/liveApi";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { demoArtwork, demoArtworkSources } from "@/lib/demoArtwork";
import type { PublicPersona } from "@/lib/types";
import type { DemoCatalog, DemoCatalogBundle, DemoScriptGroup, ManualVoiceActor } from "@/lib/demoCatalog";
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
  initialScriptKey?: string;
  refreshOnMount: boolean;
}

function DemoAuthorName({ group }: { group: DemoScriptGroup }) {
  return group.authorHref
    ? <PublicPersonLink href={group.authorHref} name={group.authorName} avatar={group.authorAvatarUrl} compact />
    : <span>{group.authorName}</span>;
}


export function DemoShowcaseClient({ initialCatalog, initialBannerSlides, initialScriptKey = "", refreshOnMount }: Props) {
  const router = useRouter();
  const [catalog, setCatalog] = useState(initialCatalog);
  const { groups: scriptGroups, personas, submissionTargets } = catalog;
  const [liveBundleLoaded, setLiveBundleLoaded] = useState(!refreshOnMount);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<DemoSort>("newest");
  const [view, setView] = useState<DemoView>("grid");
  const [randomSeed, setRandomSeed] = useState(0);
  const [selectedScriptKey, setSelectedScriptKey] = useState(initialScriptKey);
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
    if (initialScriptKey) return;
    const syncSelectionFromUrl = () => setSelectedScriptKey(new URL(window.location.href).searchParams.get("script") || "");
    syncSelectionFromUrl();
    window.addEventListener("popstate", syncSelectionFromUrl);
    return () => window.removeEventListener("popstate", syncSelectionFromUrl);
  }, [initialScriptKey]);

  useEffect(() => {
    if (liveBundleLoaded && selectedScriptKey && !scriptGroups.some((group) => group.key === selectedScriptKey)) setSelectedScriptKey("");
  }, [liveBundleLoaded, scriptGroups, selectedScriptKey]);

  const selectedGroup = scriptGroups.find((group) => group.key === selectedScriptKey);
  const scriptArtwork = selectedGroup?.coverUrl && !selectedGroup.demos.some(
    (demo) => demoArtwork(demo.url, demo.coverUrl, selectedGroup.coverUrl) === selectedGroup.coverUrl,
  ) ? selectedGroup.coverUrl : "";
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

  const returnToScriptList = () => {
    if (initialScriptKey) {
      router.push("/demos");
      return;
    }
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
      <PublicBrowseMain className={`scroll-mt-[86px] sm:scroll-mt-[57px] ${selectedGroup ? "public-demo-detail" : ""}`}>
        <PublicBrowseHeader
          title={selectedGroup?.title ?? "Demo"}
          leading={selectedGroup && <PublicBackButton label="返回台本清單" onClick={returnToScriptList} />}
          description={selectedGroup?.authorName && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <span>台本師：<DemoAuthorName group={selectedGroup} /></span>
              {selectedGroupAuthorIsVoiceActor && (
                <PublicMetadataLabel>聲演</PublicMetadataLabel>
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
          actionsClassName={selectedGroup ? "basis-full lg:basis-auto" : undefined}
          actions={
            <Dialog.Root open={showSubmissionForm} onOpenChange={setShowSubmissionForm}>
              <Dialog.Trigger asChild>
                <PublicSubmissionTrigger label="投稿 Demo" quiet={Boolean(selectedGroup)} />
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
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden truncate [font-size:var(--public-font-meta)] text-muted-foreground sm:inline" aria-live="polite">{visibleGroups.length} 部 Demo 台本</span>
              {sort === "random" && <button
                type="button"
                onClick={() => setRandomSeed(Date.now())}
                aria-label="重新隨機排序"
                title="重新隨機排序"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link"
              ><RefreshCw className="h-4 w-4" aria-hidden /></button>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PublicMorphDropdown label="Demo 排序" value={sort} groups={DEMO_SORT_GROUPS} onChange={changeSort} className="sm:hidden" align="end" />
              <AnimatedSegment label="Demo 排序" options={DEMO_SORT_OPTIONS} value={sort} onChange={changeSort}
                className="hidden h-9 border border-border sm:flex" btnClassName="whitespace-nowrap px-3 font-medium" />
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
                  const artwork = [...new Set([
                    ...group.demos.flatMap((demo) => demoArtworkSources(demo.url, demo.coverUrl)),
                    ...demoArtworkSources("", "", group.coverUrl),
                  ])];
                  const performers = publicDemoPerformers(firstDemo, voiceActorById);
                  const cardTitle = group.demos.find((demo) => demo.name.includes("｜") && /PV|試聽/.test(demo.name))?.name || group.title;
                  const href = demoDetailHref(group.key);
                  return (
                    <article key={group.key} className={`${view === "list" ? "grid grid-cols-[7rem_minmax(0,1fr)] sm:grid-cols-[12rem_minmax(0,1fr)]" : "flex flex-col"} min-w-0 overflow-hidden rounded-xl border border-border bg-card`}>
                      <Link
                        href={href}
                        prefetch={false}
                        aria-label={`開啟「${group.title}」的演出`}
                        className={`group relative isolate block w-full min-w-0 overflow-hidden bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-link ${view === "list" ? "h-full min-h-28" : "aspect-video"}`}
                      >
                        <BookOpen className="absolute inset-0 m-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
                        <DemoArtworkImage sources={artwork} alt="" className="motion-safe:transition-[filter] group-hover:brightness-90" />
                        {group.demos.length > 1 && <span aria-hidden="true" className="absolute bottom-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-medium text-white">{group.demos.length} 個版本</span>}
                      </Link>
                      <div className={`flex min-w-0 flex-1 flex-col p-2.5 ${view === "list" ? "sm:px-4 sm:py-3" : "sm:p-4"}`}>
                        <h2 className="line-clamp-2 text-[0.875rem] font-semibold leading-snug sm:text-base">{cardTitle}</h2>
                        {view === "list" && group.summary && <p className="mt-1 hidden text-sm leading-relaxed text-muted-foreground sm:block sm:truncate">{group.summary}</p>}
                        {group.authorName && <p className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground"><span className="shrink-0">台本師：</span><span className="min-w-0"><DemoAuthorName group={group} /></span></p>}
                        {group.organizationName && group.organizationHref && <p className="mt-1 min-w-0 text-xs text-muted-foreground">社團：<PublicContentLink href={group.organizationHref} appearance="identity">{group.organizationName}</PublicContentLink></p>}
                        {performers.length > 0 && <div className="mt-1"><PublicCast performers={performers} compact /></div>}
                        <div className="mt-auto pt-3">
                          <Link href={href} prefetch={false} aria-label={`查看台本「${group.title}」的演出版本`} className="public-directory-action text-xs">
                            {group.demos.length > 1 ? "查看版本" : "查看演出"}<PublicActionArrow />
                          </Link>
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
          <div className="space-y-5 sm:space-y-6">
            <section aria-label="台本資料" className="rounded-xl bg-muted/45 p-3 ring-1 ring-inset ring-border sm:p-4">
              <div className={scriptArtwork ? "grid gap-3 sm:grid-cols-[minmax(9rem,0.32fr)_minmax(0,1fr)] sm:items-start" : undefined}>
                {scriptArtwork && <div className="relative hidden aspect-[16/10] overflow-hidden rounded-lg bg-muted sm:block">
                  <BookOpen className="absolute inset-0 m-auto size-8 text-muted-foreground/50" aria-hidden />
                  <DemoArtworkImage sources={[scriptArtwork]} alt={`${selectedGroup.title}台本封面`} />
                </div>}
                <div className="min-w-0">
                  <h2 className="text-base font-semibold sm:text-lg">{selectedGroup.summary ? "台本簡介" : "台本資料"}</h2>
                  {selectedGroup.organizationName && selectedGroup.organizationHref && <p className="mt-1.5 text-sm text-muted-foreground">社團　<PublicContentLink href={selectedGroup.organizationHref} appearance="identity">{selectedGroup.organizationName}</PublicContentLink></p>}
                  {selectedGroup.summary && <p className="mt-2 max-w-[66ch] whitespace-pre-wrap break-words text-[0.9375rem] leading-7 text-foreground/85 sm:text-base sm:leading-8">{selectedGroup.summary}</p>}
                  <PublicContentLink href={selectedGroup.sourceUrl} target={selectedGroup.scriptType === "external" ? "_blank" : undefined} rel={selectedGroup.scriptType === "external" ? "noopener noreferrer" : undefined} arrow={selectedGroup.scriptType === "external"} appearance="source" className="mt-2 text-xs">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {selectedGroup.scriptType === "external" ? "閱讀原台本" : "閱讀台本"}
                  </PublicContentLink>
                </div>
              </div>
            </section>

            <section aria-labelledby="demo-performances">
              <div className="mb-3 flex flex-wrap items-baseline gap-x-2">
                <h2 id="demo-performances" className="text-lg font-semibold sm:text-xl">演出與試聽</h2>
                {selectedGroup.demos.length > 1 && <span className="text-xs text-muted-foreground">{selectedGroup.demos.length} 個版本</span>}
              </div>
              <div className="grid gap-4">
                {selectedGroup.demos.map((demo, index) => {
                  const performers = publicDemoPerformers(demo, voiceActorById);
                  const artwork = demoArtworkSources(demo.url, demo.coverUrl, selectedGroup.coverUrl);
                  return (
                    <PublicWorkDetails
                      key={`${demo.id}-${index}`}
                      title={demo.name || "演出 Demo"}
                      meta={<PublicVoiceTypes types={demo.voiceTypes} />}
                      action={<PublicPlayLink href={demo.url} target="_blank" rel="noopener noreferrer" className="text-sm">開啟 Demo</PublicPlayLink>}
                      artwork={<div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                        <Headphones className="absolute inset-0 m-auto size-8 text-muted-foreground/50" aria-hidden />
                        <DemoArtworkImage sources={artwork} alt={`${demo.name || "演出 Demo"}封面`} />
                      </div>}
                      performers={performers}
                      description={demo.description}
                    />
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
