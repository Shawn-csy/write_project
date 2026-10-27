"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Loader2, MessageSquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { liveApi } from "@/lib/liveApi";

type FeedbackKind = "bug" | "listing";

const inputClass =
  "w-full rounded-lg border border-border/70 bg-background/70 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-primary/60 focus:ring-2 focus:ring-primary/15";

function getInitialPageUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

export function PublicFeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) setPageUrl(getInitialPageUrl());
  }, [open]);

  const resetForm = () => {
    setKind("bug");
    setContactName("");
    setContactEmail("");
    setContent("");
    setHoneypot("");
    setError("");
    setSubmitted(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
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
    if (content.trim().length < 5) {
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
          content: content.trim(),
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
          aria-label="回報問題或申請上架"
          title="回報問題或申請上架"
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-muted-foreground transition-all duration-150 hover:bg-muted/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-3"
        >
          <MessageSquarePlus className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">回報／申請</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-foreground/35 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/70 bg-card p-5 shadow-2xl outline-none sm:p-6"
          aria-describedby="public-feedback-description"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">回報問題／申請上架</Dialog.Title>
              <Dialog.Description id="public-feedback-description" className="mt-1 text-sm leading-relaxed text-muted-foreground">
                如果發現網站問題，或想申請加入公開台本，請留下聯絡方式與說明。
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
              <p className="mt-3 font-medium text-foreground">已收到你的訊息</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">謝謝回報，我們會再確認內容。</p>
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
              <div>
                <label htmlFor="public-feedback-kind" className="mb-1.5 block text-sm font-medium text-foreground">用途</label>
                <select
                  id="public-feedback-kind"
                  value={kind}
                  onChange={(event) => setKind(event.target.value as FeedbackKind)}
                  className={inputClass}
                >
                  <option value="bug">回報 Bug／網站問題</option>
                  <option value="listing">申請台本上架</option>
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

              <div>
                <label htmlFor="public-feedback-content" className="mb-1.5 block text-sm font-medium text-foreground">內容</label>
                <textarea
                  id="public-feedback-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className={`${inputClass} min-h-32 resize-y`}
                  placeholder="請描述遇到的問題，或提供要申請上架的台本連結。"
                  minLength={5}
                  maxLength={10000}
                  required
                />
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
