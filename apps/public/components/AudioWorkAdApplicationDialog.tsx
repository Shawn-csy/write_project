"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Megaphone, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { liveApi } from "@/lib/liveApi";

const inputClass = "h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15";

export function AudioWorkAdApplicationDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const campaign = String(form.get("campaign") || "").trim();
    const targetUrl = String(form.get("targetUrl") || "").trim();
    const bannerUrl = String(form.get("bannerUrl") || "").trim();
    const startDate = String(form.get("startDate") || "").trim();
    const endDate = String(form.get("endDate") || "").trim();
    if (startDate && endDate && endDate < startDate) {
      setError("結束日期不能早於開始日期。");
      return;
    }

    const content = [
      "音聲作品頁廣告申請",
      `活動／品牌名稱：${campaign}`,
      `導流網址：${targetUrl}`,
      `廣告圖片：${bannerUrl}`,
      `預計期間：${startDate || "未指定"} 至 ${endDate || "未指定"}`,
      "合作說明：",
      String(form.get("notes") || "").trim() || "未提供",
    ].join("\n");

    setIsSubmitting(true);
    try {
      const response = await liveApi.write("/api/public-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "ad_application",
          contactName: String(form.get("contactName") || "").trim(),
          contactEmail: String(form.get("contactEmail") || "").trim(),
          content,
          pageUrl: typeof window === "undefined" ? "" : window.location.href,
          website: String(form.get("website") || "").trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result?.detail === "string" ? result.detail : "送出失敗，請稍後再試。");
      setSubmitted(true);
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "送出失敗，請稍後再試。");
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
        <button type="button" className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background px-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:w-auto sm:px-4">
          <Megaphone className="h-4 w-4" aria-hidden />投稿廣告
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-background p-5 shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">投稿廣告</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="關閉投稿廣告表單" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-4 w-4" aria-hidden /></button>
            </Dialog.Close>
          </div>
          {submitted ? (
            <div role="status" className="mt-5 rounded-lg border border-emerald-700/30 bg-emerald-500/10 p-4 text-sm">已收到廣告投稿，管理員審核後會再與你聯絡。</div>
          ) : (
            <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm sm:col-span-2">活動／品牌名稱<input name="campaign" required maxLength={160} className={inputClass} /></label>
              <label className="grid gap-1 text-sm">聯絡人<input name="contactName" required maxLength={120} className={inputClass} /></label>
              <label className="grid gap-1 text-sm">聯絡 Email<input name="contactEmail" type="email" required maxLength={320} className={inputClass} /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">導流網址<input name="targetUrl" type="url" required pattern="https?://.*" maxLength={2000} placeholder="https://…" className={inputClass} /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">廣告圖片網址<input name="bannerUrl" type="url" required pattern="https://.*" maxLength={2000} placeholder="https://…" className={inputClass} /></label>
              <label className="grid gap-1 text-sm">開始日期（選填）<input name="startDate" type="date" className={inputClass} /></label>
              <label className="grid gap-1 text-sm">結束日期（選填）<input name="endDate" type="date" className={inputClass} /></label>
              <label className="grid gap-1 text-sm sm:col-span-2">合作說明（選填）<textarea name="notes" rows={3} maxLength={4000} className="rounded-lg border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15" /></label>
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[10000px] h-px w-px" />
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
