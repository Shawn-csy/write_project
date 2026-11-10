"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, MessageSquarePlus, MousePointer2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { liveApi } from "@/lib/liveApi";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { PublicFeedbackTrigger } from "@/components/PublicFeedbackTrigger";
import type { ExternalPublicScript, PublicPersona, PublicScript } from "@/lib/types";

type FeedbackKind = "bug" | "listing";
interface AuthorOption { id: string; name: string; bio: string; socialUrl: string; }
interface FeedbackTarget {
  title: string;
  excerpt: string;
  selector: string;
  pageUrl: string;
}

const inputClass =
  "w-full rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/60 focus:ring-2 focus:ring-primary/15";

function getInitialPageUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function personaSocialUrl(persona: PublicPersona): string {
  let links = persona.links;
  if (typeof links === "string") {
    try { links = JSON.parse(links) as Array<{ url?: string; label?: string }>; } catch { links = []; }
  }
  if (Array.isArray(links)) {
    const social = links.find((link) => /社群|social|twitter|x\.com|pixiv|instagram|facebook|youtube|噗浪/i.test(`${link.label || ""} ${link.url || ""}`) && link.url?.trim());
    if (social?.url?.trim()) return social.url.trim();
    const first = links.find((link) => link.url?.trim());
    if (first?.url?.trim()) return first.url.trim();
  }
  return persona.website?.trim() || "";
}

function buildAuthorOptions(bundle: {
  personas?: PublicPersona[];
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
}): AuthorOption[] {
  const options = new Map<string, AuthorOption>();
  const personas = bundle.personas || [];
  const personasById = new Map(personas.map((persona) => [persona.id, persona]));
  const add = (nameValue: string, bio = "", socialUrl = "") => {
    const name = nameValue.trim();
    if (!name) return;
    const key = name.toLocaleLowerCase();
    const current = options.get(key);
    if (current) {
      current.bio ||= bio.trim();
      current.socialUrl ||= socialUrl.trim();
      return;
    }
    options.set(key, { id: `author:${key}`, name, bio: bio.trim(), socialUrl: socialUrl.trim() });
  };

  const writerTag = /台本師|編劇|劇本師|腳本家|script\s*writer/i;
  for (const persona of personas) {
    if ((persona.tags || []).some((tag) => writerTag.test(String(tag)))) {
      add(persona.displayName, persona.bio || "", personaSocialUrl(persona));
    }
  }

  for (const script of bundle.scripts || []) {
    const persona = script.persona?.id ? personasById.get(script.persona.id) : undefined;
    const name = script.authorOverrideName?.trim()
      || persona?.displayName
      || script.persona?.displayName
      || script.owner?.displayName
      || "";
    add(name, persona?.bio || script.persona?.bio || "", persona ? personaSocialUrl(persona) : script.persona?.website || "");
  }

  for (const script of bundle.externalPublicScripts || []) {
    // The public bundle endpoint only returns published external scripts.
    add(script.authorName || "", script.authorBio || "", script.authorUrl || "");
  }

  return [...options.values()].sort((left, right) => left.name.localeCompare(right.name, "zh-Hant"));
}

export interface PublicFeedbackDialogProps {
  mode?: "choice" | FeedbackKind;
  compactAtMobile?: boolean;
  showLabel?: boolean;
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PublicFeedbackDialog({
  mode = "choice",
  compactAtMobile = false,
  showLabel = false,
  hideTrigger = false,
  open: controlledOpen,
  onOpenChange,
}: PublicFeedbackDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const [kind, setKind] = useState<FeedbackKind | null>(mode === "choice" ? null : mode);
  const [step, setStep] = useState(0);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [scriptTitle, setScriptTitle] = useState("");
  const [scriptSummary, setScriptSummary] = useState("");
  const [authorOptions, setAuthorOptions] = useState<AuthorOption[]>([]);
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  const [authorSocialUrl, setAuthorSocialUrl] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [categoriesText, setCategoriesText] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [notes, setNotes] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isPickingTarget, setIsPickingTarget] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<FeedbackTarget[]>([]);
  const [requestedAction, setRequestedAction] = useState("修改");
  const [requestedResolution, setRequestedResolution] = useState("");
  const hoveredElement = useRef<HTMLElement | null>(null);

  const stopPicking = useCallback(() => {
    setIsPickingTarget(false);
    const previous = hoveredElement.current;
    if (previous) {
      previous.removeAttribute("data-feedback-pick-hover");
      hoveredElement.current = null;
    }
  }, []);

  useEffect(() => {
    if (open) setPageUrl(getInitialPageUrl());
  }, [open]);

  useEffect(() => {
    if (!open || authorOptions.length > 0) return;
    let active = true;
    setIsLoadingPersonas(true);
    void readPublicBundle<{ personas?: PublicPersona[]; scripts?: PublicScript[]; externalPublicScripts?: ExternalPublicScript[] }>(["personas", "scripts", "externalPublicScripts"])
      .then(({ data }) => {
        if (active) setAuthorOptions(buildAuthorOptions(data));
      })
      .catch((loadError) => {
        if (active) console.error("Failed to load public author options", loadError);
      })
      .finally(() => {
        if (active) setIsLoadingPersonas(false);
      });
    return () => { active = false; };
  }, [open, authorOptions.length]);

  const resetForm = () => {
    setKind(null);
    setStep(0);
    setContactName("");
    setContactEmail("");
    setScriptTitle("");
    setScriptSummary("");
    setSelectedAuthorId("");
    setAuthorName("");
    setAuthorBio("");
    setAuthorSocialUrl("");
    setDocumentUrl("");
    setCoverUrl("");
    setCategoriesText("");
    setSeriesName("");
    setNotes("");
    setContent("");
    setSelectedTargets([]);
    setRequestedAction("修改");
    setRequestedResolution("");
    setHoneypot("");
    setError("");
    setSubmitted(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && mode !== "choice") setKind(mode);
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
    if (!nextOpen) resetForm();
  };

  const setDialogOpen = (nextOpen: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const startTargetPicking = () => {
    if (kind !== "bug") return;
    setError("");
    setDialogOpen(false);
    setIsPickingTarget(true);
    window.dispatchEvent(new CustomEvent("public-feedback-start-target-picking"));
  };

  useEffect(() => {
    if (!isPickingTarget) return;
    const getElement = (eventTarget: EventTarget | null): HTMLElement | null => {
      const baseElement = eventTarget instanceof HTMLElement
        ? eventTarget
        : eventTarget instanceof Element ? eventTarget.parentElement : null;
      if (!baseElement) return null;
      const element = baseElement.closest<HTMLElement>("[data-feedback-target]")
        || baseElement.closest<HTMLElement>("article, section, main, header, footer, nav, h1, h2, h3, p, li, button, a, img, figure, [role='button']")
        || baseElement;
      if (element.closest("[data-feedback-picker-ignore], [data-radix-portal]")) return null;
      return element;
    };
    const onPointerMove = (event: PointerEvent) => {
      const next = getElement(event.target);
      if (next === hoveredElement.current) return;
      const previous = hoveredElement.current;
      if (previous) {
        previous.removeAttribute("data-feedback-pick-hover");
      }
      hoveredElement.current = next;
      if (next) {
        next.setAttribute("data-feedback-pick-hover", "true");
      }
    };
    const onClick = (event: MouseEvent) => {
      const element = getElement(event.target);
      if (!element) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const marked = element.closest<HTMLElement>("[data-feedback-target]");
      const heading = marked?.querySelector("h1, h2, h3, h4") || element.querySelector("h1, h2, h3, h4");
      const text = (marked || element).innerText?.replace(/\s+/g, " ").trim() || "";
      const title = marked?.dataset.feedbackTitle
        || heading?.textContent?.trim()
        || element.getAttribute("aria-label")
        || element.getAttribute("title")
        || text.slice(0, 90)
        || `${element.tagName.toLocaleLowerCase()} 區塊`;
      const excerpt = text.slice(0, 400);
      const path: string[] = [];
      let cursor: HTMLElement | null = marked || element;
      while (cursor && cursor !== document.body && path.length < 5) {
        let segment = cursor.tagName.toLocaleLowerCase();
        if (cursor.id) segment += `#${cursor.id}`;
        else if (cursor.dataset.feedbackTarget) segment += `[data-feedback-target="${cursor.dataset.feedbackTarget}"]`;
        else if (cursor.classList.length) segment += `.${Array.from(cursor.classList).slice(0, 2).join(".")}`;
        path.unshift(segment);
        cursor = cursor.parentElement;
      }
      const picked: FeedbackTarget = {
        title: title.slice(0, 160),
        excerpt,
        selector: path.join(" > "),
        pageUrl: getInitialPageUrl(),
      };
      stopPicking();
      setSelectedTargets((current) => current.some((target) => target.pageUrl === picked.pageUrl && target.selector === picked.selector)
        ? current
        : [...current, picked]);
      setPageUrl(picked.pageUrl);
      setDialogOpen(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") stopPicking();
    };
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      const previous = hoveredElement.current;
      if (previous) {
        previous.removeAttribute("data-feedback-pick-hover");
        hoveredElement.current = null;
      }
    };
  }, [isPickingTarget, stopPicking]);

  const handleAuthorChange = (authorId: string) => {
    setSelectedAuthorId(authorId);
    if (authorId === "__custom__") {
      setAuthorName("");
      setAuthorBio("");
      setAuthorSocialUrl("");
      return;
    }
    const author = authorOptions.find((item) => item.id === authorId);
    if (!author) {
      setAuthorName("");
      setAuthorBio("");
      setAuthorSocialUrl("");
      return;
    }
    setAuthorName(author.name);
    setAuthorBio(author.bio);
    setAuthorSocialUrl(author.socialUrl);
  };

  const LISTING_STEPS = ["作品", "細節", "確認送出"] as const;

  /** Returns an error message for the given step, or "" when it can proceed. */
  const validateStep = (target: number): string => {
    if (kind === "listing") {
      if (target === 0) {
        if (!scriptTitle.trim()) return "請填寫台本名稱。";
        if (!authorName.trim()) return "請選擇或填寫台本作者。";
        if (!/^https:\/\/\S+$/i.test(documentUrl.trim())) return "請提供有效的 HTTPS 台本文件連結。";
      }
      if (target === 1) {
        if (authorSocialUrl.trim() && !/^https:\/\/\S+$/i.test(authorSocialUrl.trim())) return "作者社群連結請使用 HTTPS 網址。";
        if (coverUrl.trim() && !/^https:\/\/\S+$/i.test(coverUrl.trim())) return "封面連結請使用 HTTPS 網址。";
      }
    }
    if (kind === "bug" || (kind === "listing" && target === 2)) {
      if (!contactName.trim() && !contactEmail.trim()) return "請至少填寫聯絡名稱或 Email。";
      if (contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(contactEmail.trim())) return "請確認 Email 格式。";
    }
    if (kind === "bug" && content.trim().length < 5) return "內容至少需要 5 個字。";
    return "";
  };

  const goToStep = (target: number) => {
    setError("");
    if (target > step) {
      for (let index = step; index < target; index += 1) {
        const message = validateStep(index);
        if (message) {
          setStep(index);
          setError(message);
          return;
        }
      }
    }
    setStep(Math.max(0, Math.min(LISTING_STEPS.length - 1, target)));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!kind) return;
    // Enter inside an early step moves forward instead of submitting a half-filled form.
    if (kind === "listing" && step < LISTING_STEPS.length - 1) {
      goToStep(step + 1);
      return;
    }
    const lastStepError = kind === "listing"
      ? [0, 1, 2].map(validateStep).find(Boolean) || ""
      : validateStep(0);
    if (lastStepError) {
      setError(lastStepError);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await liveApi.write("/api/public-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          scriptTitle: scriptTitle.trim(),
          scriptSummary: scriptSummary.trim(),
          authorName: authorName.trim(),
          authorBio: authorBio.trim(),
          authorSocialUrl: authorSocialUrl.trim(),
          documentUrl: documentUrl.trim(),
          coverUrl: coverUrl.trim(),
          categories: categoriesText.split(/[,，、]/).map((value) => value.trim()).filter(Boolean),
          seriesName: seriesName.trim(),
          notes: notes.trim(),
          content: kind === "listing" ? notes.trim() : [
            selectedTargets.length ? "【點選位置回報】" : "",
            selectedTargets.length ? `希望處理：${requestedAction}` : "",
            requestedResolution.trim() ? `希望處理說明：${requestedResolution.trim()}` : "",
            ...selectedTargets.flatMap((target, index) => [
              `位置 ${index + 1}：${target.title}`,
              `畫面文字 ${index + 1}：${target.excerpt || "（此區塊沒有可擷取文字）"}`,
              `頁面位置 ${index + 1}：${target.selector}`,
            ]),
            content.trim(),
          ].filter(Boolean).join("\n"),
          pageUrl: selectedTargets[0]?.pageUrl || pageUrl,
          website: honeypot,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data?.detail === "string" ? data.detail : "送出失敗，請稍後再試。");
      }
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "送出失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    {isPickingTarget && (
      <div data-feedback-picker-ignore className="fixed inset-x-3 top-3 z-[120] mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border border-primary/50 bg-card/95 px-4 py-3 text-sm text-foreground shadow-xl backdrop-blur sm:top-5">
        <div className="flex min-w-0 items-center gap-2"><MousePointer2 className="h-4 w-4 shrink-0 text-primary" aria-hidden /><span>點選頁面上有問題的區塊；按 Esc 可取消。</span></div>
        <button type="button" onClick={stopPicking} className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">取消</button>
      </div>
    )}
    <style>{`[data-feedback-pick-hover="true"]{outline:2px solid hsl(var(--primary))!important;outline-offset:2px!important;box-shadow:0 0 0 5px hsl(var(--primary)/.18)!important;cursor:crosshair!important}`}</style>
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && <Dialog.Trigger asChild><PublicFeedbackTrigger mode={mode} compactAtMobile={compactAtMobile} showLabel={showLabel} /></Dialog.Trigger>}

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-foreground/35 backdrop-blur-[2px]" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] ${kind === "listing" ? "max-w-5xl" : "max-w-lg"} max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-card p-5 shadow-2xl outline-none sm:p-6`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">{kind === "bug" ? "回報問題" : kind === "listing" ? "投稿台本" : "回報／投稿"}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="關閉回報表單"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </Dialog.Close>
          </div>

          {!submitted && kind === null && mode === "choice" ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2" role="group" aria-label="選擇回報或投稿">
              <button
                type="button"
                onClick={() => { setKind("bug"); setStep(0); setError(""); }}
                className="rounded-xl border border-border/70 bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MousePointer2 className="h-5 w-5 text-primary" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-foreground">回報問題</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">網站壞掉、內容有誤、想請我們修改某個位置。</p>
              </button>
              <button
                type="button"
                onClick={() => { setKind("listing"); setStep(0); setError(""); }}
                className="rounded-xl border border-border/70 bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <MessageSquarePlus className="h-5 w-5 text-primary" aria-hidden />
                <p className="mt-3 text-sm font-semibold text-foreground">投稿台本</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">把你的台本加入公開專區，分三步完成。</p>
              </button>
            </div>
          ) : submitted ? (
            <div className="mt-6 rounded-xl border border-primary/25 bg-primary/5 p-5 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" aria-hidden />
              <p className="mt-3 font-medium text-foreground">{kind === "listing" ? "已收到你的台本投稿" : "已收到你的 Bug 回報"}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{kind === "listing" ? "審核通過後會匯入公開台本草稿，再由管理員確認發佈。" : "謝謝回報，我們會再確認內容。"}</p>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  關閉
                </button>
              </Dialog.Close>
            </div>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <div className={kind === "listing" ? "grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]" : ""}>
                <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {mode === "choice" && <button
                  type="button"
                  onClick={() => { setKind(mode === "choice" ? null : mode); setStep(0); setError(""); }}
                  className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                >
                  ← 換個用途
                </button>}
                {kind === "listing" && (
                  <ol className="flex items-center gap-1.5 text-xs" aria-label="投稿步驟">
                    {LISTING_STEPS.map((label, index) => (
                      <li key={label} aria-current={index === step ? "step" : undefined} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => goToStep(index)}
                          className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 font-medium ${index === step ? "bg-primary text-primary-foreground" : index < step ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          <span>{index + 1}</span><span>{label}</span>
                        </button>
                        {index < LISTING_STEPS.length - 1 && <span className="text-muted-foreground/50" aria-hidden>›</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className={kind === "bug" || step === 2 ? "grid gap-4 sm:grid-cols-2" : "hidden"}>
                <div>
                  <label htmlFor="public-feedback-name" className="mb-1.5 block text-sm font-medium text-foreground">聯絡名稱</label>
                  <input
                    id="public-feedback-name"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    className={inputClass}
                    placeholder="你的稱呼"
                    maxLength={120}
                  />
                </div>
                <div>
                  <label htmlFor="public-feedback-email" className="mb-1.5 block text-sm font-medium text-foreground">Email</label>
                  <input
                    id="public-feedback-email"
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    className={inputClass}
                    placeholder="方便回覆你的信箱"
                    maxLength={320}
                  />
                </div>
              </div>

              {kind === "listing" ? (
                <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-3 sm:p-4">
                  <div className={step === 0 ? "space-y-4" : "hidden"}>
                  <div>
                    <label htmlFor="public-feedback-title" className="mb-1.5 block text-sm font-medium text-foreground">台本名稱</label>
                    <input id="public-feedback-title" value={scriptTitle} onChange={(event) => setScriptTitle(event.target.value)} className={inputClass} placeholder="公開頁顯示的台本名稱" maxLength={300} required />
                  </div>
                  <div>
                    <label htmlFor="public-feedback-author" className="mb-1.5 block text-sm font-medium text-foreground">台本師</label>
                    <select id="public-feedback-author" value={selectedAuthorId} onChange={(event) => handleAuthorChange(event.target.value)} className={inputClass} required>
                      <option value="" disabled>{isLoadingPersonas ? "載入台本師名單…" : "選擇台本師，或自行輸入"}</option>
                      {authorOptions.map((author) => <option key={author.id} value={author.id}>{author.name}</option>)}
                      <option value="__custom__">自行輸入台本師</option>
                    </select>
                    {selectedAuthorId === "__custom__" ? (
                      <input value={authorName} onChange={(event) => setAuthorName(event.target.value)} className={`${inputClass} mt-2`} placeholder="台本作者的公開名稱" maxLength={120} aria-label="自訂作者名稱" required />
                    ) : selectedAuthorId ? (
                      <p className="mt-1 [font-size:var(--public-font-caption)] text-muted-foreground">已帶入作者資料：{authorName}</p>
                    ) : null}
                  </div>
                  <div>
                    <label htmlFor="public-feedback-summary" className="mb-1.5 block text-sm font-medium text-foreground">台本介紹 <span className="font-normal text-muted-foreground">（選填）</span></label>
                    <textarea id="public-feedback-summary" value={scriptSummary} onChange={(event) => setScriptSummary(event.target.value)} className={`${inputClass} min-h-24 resize-y`} placeholder="簡短介紹作品內容，會顯示在台本頁面" maxLength={4000} />
                  </div>
                  <div>
                    <label htmlFor="public-feedback-document" className="mb-1.5 block text-sm font-medium text-foreground">台本文件連結</label>
                    <input id="public-feedback-document" type="url" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} className={inputClass} placeholder="https://…" maxLength={2000} required />
                  </div>
                  </div>
                  <div className={step === 1 ? "space-y-4" : "hidden"}>
                  <div>
                    <label htmlFor="public-feedback-author-bio" className="mb-1.5 block text-sm font-medium text-foreground">作者介紹 <span className="font-normal text-muted-foreground">（選填）</span></label>
                    <textarea id="public-feedback-author-bio" value={authorBio} onChange={(event) => setAuthorBio(event.target.value)} className={`${inputClass} min-h-20 resize-y`} placeholder="選擇台本師後會帶入已有介紹，也可以自行調整" maxLength={4000} />
                  </div>
                  <div>
                    <label htmlFor="public-feedback-author-social" className="mb-1.5 block text-sm font-medium text-foreground">作者社群連結 <span className="font-normal text-muted-foreground">（選填）</span></label>
                    <input id="public-feedback-author-social" type="url" value={authorSocialUrl} onChange={(event) => setAuthorSocialUrl(event.target.value)} className={inputClass} placeholder="https://…" maxLength={2000} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="public-feedback-tags" className="mb-1.5 block text-sm font-medium text-foreground">標籤</label>
                      <input id="public-feedback-tags" value={categoriesText} onChange={(event) => setCategoriesText(event.target.value)} className={inputClass} placeholder="例如：全年齡、療癒" maxLength={500} />
                      <p className="mt-1 [font-size:var(--public-font-caption)] text-muted-foreground">多個標籤請用逗號分隔</p>
                    </div>
                    <div>
                      <label htmlFor="public-feedback-series" className="mb-1.5 block text-sm font-medium text-foreground">系列 <span className="font-normal text-muted-foreground">（選填）</span></label>
                      <input id="public-feedback-series" value={seriesName} onChange={(event) => setSeriesName(event.target.value)} className={inputClass} placeholder="系列名稱" maxLength={120} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="public-feedback-cover" className="mb-1.5 block text-sm font-medium text-foreground">封面連結 <span className="font-normal text-muted-foreground">（選填）</span></label>
                    <input id="public-feedback-cover" type="url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} className={inputClass} placeholder="https://…" maxLength={2000} />
                  </div>
                  <div>
                    <label htmlFor="public-feedback-notes" className="mb-1.5 block text-sm font-medium text-foreground">備註 <span className="font-normal text-muted-foreground">（選填）</span></label>
                    <textarea id="public-feedback-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-24 resize-y`} placeholder="補充作品資訊或上架說明" maxLength={10000} />
                  </div>
                  </div>
                  <div className={step === 2 ? "space-y-1 text-sm" : "hidden"}>
                    <p className="font-medium text-foreground">確認後送出</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">請確認作品資訊，並留下聯絡方式供審核使用；聯絡資料不會公開。</p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">回報位置 <span className="font-normal text-muted-foreground">（選填）</span></p>
                      </div>
                      <button type="button" onClick={startTargetPicking} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/40 px-3 text-xs font-medium text-primary hover:bg-primary/10"><MousePointer2 className="h-3.5 w-3.5" aria-hidden />{selectedTargets.length ? "再選一個位置" : "點選頁面位置"}</button>
                    </div>
                    {selectedTargets.length > 0 && <div className="mt-3 space-y-2">{selectedTargets.map((target, index) => <div key={`${target.pageUrl}:${target.selector}`} className="rounded-lg border border-border/60 bg-background/70 p-2.5 text-xs"><div className="flex items-start justify-between gap-2"><p className="font-medium text-foreground">位置 {index + 1}：{target.title}</p><button type="button" onClick={() => setSelectedTargets((current) => current.filter((_, targetIndex) => targetIndex !== index))} className="shrink-0 rounded px-2 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`移除位置 ${index + 1}`}>移除</button></div><p className="mt-1 line-clamp-2 text-muted-foreground">{target.excerpt || "沒有可擷取的文字內容"}</p></div>)}</div>}
                  </div>
                  <div className="mb-3 space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-medium text-foreground">希望怎麼處理</p></div><select aria-label="希望怎麼處理" value={requestedAction} onChange={(event) => setRequestedAction(event.target.value)} className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"><option>修改</option><option>刪除</option><option>確認／補充</option><option>其他</option></select></div>
                    <textarea aria-label="處理方式補充說明" value={requestedResolution} onChange={(event) => setRequestedResolution(event.target.value)} className={`${inputClass} min-h-20 resize-y`} placeholder="補充希望如何修改或處理，例如：請移除這段，或將文字更正為……" maxLength={4000} />
                  </div>
                  <label htmlFor="public-feedback-content" className="mb-1.5 block text-sm font-medium text-foreground">問題描述</label>
                  <textarea
                    id="public-feedback-content"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className={`${inputClass} min-h-32 resize-y`}
                    placeholder="請描述遇到的網站問題，以及發生步驟。"
                    minLength={5}
                    maxLength={10000}
                    required
                  />
                </div>
              )}
                </div>
                {kind === "listing" && (
                  <aside className="lg:sticky lg:top-0 lg:self-start">
                    <p className="mb-2 text-sm font-semibold">公開台本預覽</p>
                    <article className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
                      {coverUrl.trim() && /^https:\/\/\S+$/i.test(coverUrl.trim())
                        ? <img src={coverUrl.trim()} alt="台本封面預覽" referrerPolicy="no-referrer" className="aspect-[16/10] w-full bg-muted object-cover" loading="lazy" />
                        : <div className="aspect-[16/10] bg-muted" aria-hidden="true" />}
                      <div className="space-y-2 p-3">
                        <div className="flex flex-wrap gap-1">
                          {categoriesText.split(/[,，、]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 [font-size:var(--public-font-caption)] text-primary">{tag}</span>)}
                        </div>
                        <h3 className="line-clamp-2 text-base font-semibold">{scriptTitle.trim() || "台本名稱"}</h3>
                        <p className="text-xs text-muted-foreground">作者：{authorName.trim() || "作者名稱"}</p>
                        {scriptSummary.trim() && <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{scriptSummary.trim()}</p>}
                        {seriesName.trim() && <p className="text-xs text-muted-foreground">系列：{seriesName.trim()}</p>}
                      </div>
                    </article>
                  </aside>
                )}
              </div>

              <input
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-px w-px opacity-0"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
                name="website"
              />

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                {kind === "listing" && step > 0 && (
                  <button
                    type="button"
                    onClick={() => goToStep(step - 1)}
                    className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    上一步
                  </button>
                )}
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    取消
                  </button>
                </Dialog.Close>
                {kind === "listing" && step < LISTING_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => goToStep(step + 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    下一步
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {isSubmitting ? "送出中…" : kind === "listing" ? "送出投稿" : "送出回報"}
                  </button>
                )}
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    </>
  );
}
