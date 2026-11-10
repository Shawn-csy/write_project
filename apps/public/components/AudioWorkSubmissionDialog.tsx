"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { PublicOrg } from "@/lib/types";
import { liveApi } from "@/lib/liveApi";

const inputClass = "h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15";

export function AudioWorkSubmissionDialog({ organizations = [] }: { organizations?: PublicOrg[] }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await liveApi.write("/api/public-audio-work-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(form.get("title") || "").trim(),
          url: String(form.get("url") || "").trim(),
          coverUrl: String(form.get("coverUrl") || "").trim(),
          description: String(form.get("description") || "").trim(),
          creatorName: String(form.get("creatorName") || "").trim(),
          creatorUrl: String(form.get("creatorUrl") || "").trim(),
          organizationId: String(form.get("organizationId") || "").trim() || null,
          accessType: String(form.get("accessType") || "paid"),
          contactEmail: String(form.get("contactEmail") || "").trim(),
          confirmPublic: form.get("confirmPublic") === "on",
          website: String(form.get("website") || "").trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result?.detail === "string" ? result.detail : "投稿失敗，請稍後再試。");
      setSubmitted(true);
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "投稿失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSubmitted(false);
      setError("");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <Plus className="h-4 w-4" aria-hidden />投稿作品
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-background p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">投稿音聲作品</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">審核通過後會公開在音聲作品頁。</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" aria-label="關閉投稿表單" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" aria-hidden /></button>
            </Dialog.Close>
          </div>
          {submitted ? (
            <div role="status" className="mt-5 rounded-lg border border-emerald-700/30 bg-emerald-500/10 p-4 text-sm">投稿已送出，審核通過後會公開。</div>
          ) : (
            <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm sm:col-span-2">作品名稱
                <input name="title" required maxLength={180} className={inputClass} />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">作品或試聽連結
                <input name="url" type="url" required pattern="https://.*" maxLength={2000} placeholder="https://…" className={inputClass} />
              </label>
              <label className="grid gap-1 text-sm">作品類型
                <select name="accessType" defaultValue="paid" className={inputClass}><option value="paid">付費作品</option><option value="free">免費作品</option></select>
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">封面圖片連結（選填）
                <input name="coverUrl" type="url" pattern="https://.*" maxLength={2000} placeholder="https://…" className={inputClass} />
              </label>
              <label className="grid gap-1 text-sm">創作者／團隊
                <input name="creatorName" required maxLength={120} className={inputClass} />
              </label>
              {organizations.length > 0 && <label className="grid gap-1 text-sm">所屬組織（選填）
                <select name="organizationId" className={inputClass} defaultValue="">
                  <option value="">審核時確認</option>
                  {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                </select>
              </label>}
              <label className="grid gap-1 text-sm">創作者頁面（選填）
                <input name="creatorUrl" type="url" pattern="https://.*" maxLength={2000} placeholder="https://…" className={inputClass} />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">作品介紹（選填）
                <textarea name="description" rows={3} maxLength={2000} className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">聯絡 Email（選填）
                <input name="contactEmail" type="email" maxLength={320} className={inputClass} />
              </label>
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px" />
              <label className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground sm:col-span-2">
                <input name="confirmPublic" type="checkbox" required className="mt-0.5" />
                我有權提供以上資料，且作品連結與封面可公開展示。
              </label>
              {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Dialog.Close asChild><button type="button" className="h-10 rounded-md border border-border px-4 text-sm">取消</button></Dialog.Close>
                <button type="submit" disabled={isSubmitting} className="h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{isSubmitting ? "送出中…" : "送出審核"}</button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
