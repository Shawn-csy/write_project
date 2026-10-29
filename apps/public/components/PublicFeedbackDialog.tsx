"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, MessageSquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { liveApi } from "@/lib/liveApi";
import type { ExternalPublicScript, PublicPersona, PublicScript } from "@/lib/types";

type FeedbackKind = "bug" | "listing";
interface AuthorOption { id: string; name: string; bio: string; socialUrl: string; }

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

export function PublicFeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
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

  useEffect(() => {
    if (open) setPageUrl(getInitialPageUrl());
  }, [open]);

  useEffect(() => {
    if (!open || authorOptions.length > 0) return;
    const controller = new AbortController();
    setIsLoadingPersonas(true);
    void liveApi.readJson<{ personas?: PublicPersona[]; scripts?: PublicScript[]; externalPublicScripts?: ExternalPublicScript[] }>("/api/public-bundle", { signal: controller.signal })
      .then(({ data }) => {
        setAuthorOptions(buildAuthorOptions(data));
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) console.error("Failed to load public author options", loadError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingPersonas(false);
      });
    return () => controller.abort();
  }, [open, authorOptions.length]);

  const resetForm = () => {
    setKind("bug");
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
    setHoneypot("");
    setError("");
    setSubmitted(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!contactName.trim() && !contactEmail.trim()) {
      setError("請至少填寫聯絡名稱或 Email。");
      return;
    }
    if (contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(contactEmail.trim())) {
      setError("請確認 Email 格式。");
      return;
    }
    if (kind === "listing" && !authorName.trim()) {
      setError("請填寫台本作者名稱。");
      return;
    }
    if (kind === "listing" && !scriptTitle.trim()) {
      setError("請填寫台本名稱。");
      return;
    }
    if (kind === "listing" && !/^https:\/\/\S+$/i.test(documentUrl.trim())) {
      setError("請提供有效的 HTTPS 台本文件連結。");
      return;
    }
    if (kind === "listing" && authorSocialUrl.trim() && !/^https:\/\/\S+$/i.test(authorSocialUrl.trim())) {
      setError("作者社群連結請使用 HTTPS 網址。");
      return;
    }
    if (kind === "listing" && coverUrl.trim() && !/^https:\/\/\S+$/i.test(coverUrl.trim())) {
      setError("封面連結請使用 HTTPS 網址。");
      return;
    }
    if (kind === "bug" && content.trim().length < 5) {
      setError("內容至少需要 5 個字。");
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
          content: kind === "listing" ? notes.trim() : content.trim(),
          pageUrl,
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
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Bug 回報或台本投稿"
          title="Bug 回報或台本投稿"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-3"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">回報／投稿</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-foreground/35 backdrop-blur-[2px]" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] ${kind === "listing" ? "max-w-5xl" : "max-w-lg"} max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-card p-5 shadow-2xl outline-none sm:p-6`}
          aria-describedby="public-feedback-description"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Bug 回報／台本投稿</Dialog.Title>
              <Dialog.Description id="public-feedback-description" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                回報網站問題，或投稿台本加入公開專區。
              </Dialog.Description>
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

          {submitted ? (
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
              <div>
                <label htmlFor="public-feedback-kind" className="mb-1.5 block text-sm font-medium text-foreground">用途</label>
                <select
                  id="public-feedback-kind"
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value as FeedbackKind);
                    setError("");
                  }}
                  className={inputClass}
                >
                  <option value="bug">回報 Bug／網站問題</option>
                  <option value="listing">投稿台本</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
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
                      <p className="mt-1 text-[11px] text-muted-foreground">已帶入作者資料：{authorName}</p>
                    ) : null}
                  </div>
                  <div>
                    <label htmlFor="public-feedback-author-bio" className="mb-1.5 block text-sm font-medium text-foreground">作者介紹 <span className="font-normal text-muted-foreground">（選填）</span></label>
                    <textarea id="public-feedback-author-bio" value={authorBio} onChange={(event) => setAuthorBio(event.target.value)} className={`${inputClass} min-h-20 resize-y`} placeholder="選擇台本師後會帶入已有介紹，也可以自行調整" maxLength={4000} />
                  </div>
                  <div>
                    <label htmlFor="public-feedback-summary" className="mb-1.5 block text-sm font-medium text-foreground">台本介紹 <span className="font-normal text-muted-foreground">（選填）</span></label>
                    <textarea id="public-feedback-summary" value={scriptSummary} onChange={(event) => setScriptSummary(event.target.value)} className={`${inputClass} min-h-24 resize-y`} placeholder="簡短介紹作品內容，會顯示在台本頁面" maxLength={4000} />
                  </div>
                  <div>
                    <label htmlFor="public-feedback-author-social" className="mb-1.5 block text-sm font-medium text-foreground">作者社群連結 <span className="font-normal text-muted-foreground">（選填）</span></label>
                    <input id="public-feedback-author-social" type="url" value={authorSocialUrl} onChange={(event) => setAuthorSocialUrl(event.target.value)} className={inputClass} placeholder="https://…" maxLength={2000} />
                  </div>
                  <div>
                    <label htmlFor="public-feedback-document" className="mb-1.5 block text-sm font-medium text-foreground">台本文件連結</label>
                    <input id="public-feedback-document" type="url" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} className={inputClass} placeholder="https://…" maxLength={2000} required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="public-feedback-tags" className="mb-1.5 block text-sm font-medium text-foreground">標籤</label>
                      <input id="public-feedback-tags" value={categoriesText} onChange={(event) => setCategoriesText(event.target.value)} className={inputClass} placeholder="例如：全年齡、療癒" maxLength={500} />
                      <p className="mt-1 text-[11px] text-muted-foreground">多個標籤請用逗號分隔</p>
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
              ) : (
                <div>
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
                        : <div className="flex aspect-[16/10] items-center justify-center bg-muted text-xs text-muted-foreground">填入封面連結後顯示</div>}
                      <div className="space-y-2 p-3">
                        <div className="flex flex-wrap gap-1">
                          {categoriesText.split(/[,，、]/).map((tag) => tag.trim()).filter(Boolean).slice(0, 5).map((tag) => <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{tag}</span>)}
                          {!categoriesText.trim() && <span className="text-[10px] text-muted-foreground">尚未設定標籤</span>}
                        </div>
                        <h3 className="line-clamp-2 text-base font-semibold">{scriptTitle.trim() || "台本名稱"}</h3>
                        <p className="text-xs text-muted-foreground">作者：{authorName.trim() || "作者名稱"}</p>
                        {scriptSummary.trim() && <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{scriptSummary.trim()}</p>}
                        {seriesName.trim() && <p className="text-xs text-muted-foreground">系列：{seriesName.trim()}</p>}
                        <div className="border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                          {documentUrl.trim() ? "點擊後會開啟你提供的台本文件" : "填入文件連結後，讀者可前往閱讀台本"}
                        </div>
                      </div>
                    </article>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">送出後會進入審核；管理員可一鍵匯入為草稿，檢查後再發佈。</p>
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
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    取消
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  {isSubmitting ? "送出中…" : "送出"}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
