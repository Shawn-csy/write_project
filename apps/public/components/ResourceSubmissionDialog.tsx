"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { liveApi } from "@/lib/liveApi";

const inputClass = "h-10 w-full rounded-lg border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15";
const emptyWork = () => ({ title: "", url: "", role: "", workType: "audio", coverUrl: "" });

export function ResourceSubmissionDialog({ defaultCategory }: { defaultCategory: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [works, setWorks] = useState([emptyWork()]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (works.some((item) => !item.url.trim() && (item.title.trim() || item.role.trim() || item.coverUrl.trim()))) {
        throw new Error("已填寫的參與作品都需要作品網址。");
      }
      const submittedWorks = works.filter((item) => item.url.trim()).map((item) => ({
        title: item.title.trim(), url: item.url.trim(), role: item.role.trim(),
        workType: item.workType, coverUrl: item.coverUrl.trim(),
      }));
      if (category !== "voice_actor" && submittedWorks.length === 0) throw new Error("請至少提供一部參與作品。");
      if (submittedWorks.some((item) => !item.title)) throw new Error("請填寫每部參與作品的名稱。");
      if (category !== "voice_actor" && !String(form.get("profileUrl") || "").trim() && !String(form.get("socialUrl") || "").trim()) {
        throw new Error("請提供官方、委託或社群連結，方便核對資源。");
      }
      const response = await liveApi.write("/api/production-resource-submissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") || "").trim(), category,
          bio: String(form.get("bio") || "").trim(),
          avatarUrl: String(form.get("avatarUrl") || "").trim(),
          profileUrl: String(form.get("profileUrl") || "").trim(),
          links: [{ label: String(form.get("socialLabel") || "").trim() || "社群連結", url: String(form.get("socialUrl") || "").trim() }].filter((item) => item.url),
          works: submittedWorks,
          submitterName: String(form.get("submitterName") || "").trim(),
          contactEmail: String(form.get("contactEmail") || "").trim(),
          websiteTrap: String(form.get("websiteTrap") || ""),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : "投稿失敗，請稍後再試。");
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "投稿失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  return <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (next) setCategory(defaultCategory); else { setSubmitted(false); setError(""); } }}>
    <Dialog.Trigger asChild><button type="button" className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:h-10 sm:gap-1.5 sm:px-4"><Plus className="h-4 w-4" aria-hidden />投稿資源</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border/70 bg-background p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-lg font-semibold">投稿資源</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">送出後由管理員審核，核准才會公開。已有頁面請在該頁補充資料。</Dialog.Description></div><Dialog.Close asChild><button type="button" aria-label="關閉投稿表單" className="rounded-md p-2 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" aria-hidden /></button></Dialog.Close></div>
        {submitted ? <p role="status" className="mt-5 rounded-lg border border-emerald-700/30 bg-emerald-500/10 p-4 text-sm">投稿已送出，審核通過後會公開。</p> : <form onSubmit={submit} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">資源類別<select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}><option value="voice_actor">聲演</option><option value="post_production">後製</option><option value="cover_art">封面</option><option value="recording_studio">錄音室</option></select></label>
          <label className="grid gap-1 text-sm">名稱<input name="name" required maxLength={120} className={inputClass} /></label>
          <label className="grid gap-1 text-sm sm:col-span-2">簡介<textarea name="bio" maxLength={4000} rows={3} className={`${inputClass} h-auto py-2`} /></label>
          <label className="grid gap-1 text-sm sm:col-span-2">官方／委託頁網址<input name="profileUrl" type="url" placeholder="https://…" maxLength={2000} className={inputClass} /></label>
          <label className="grid gap-1 text-sm sm:col-span-2">頭像或商標圖片網址<input name="avatarUrl" type="url" placeholder="https://…" maxLength={2000} className={inputClass} /></label>
          <label className="grid gap-1 text-sm">其他連結名稱<input name="socialLabel" maxLength={120} placeholder="例如 X、Instagram" className={inputClass} /></label>
          <label className="grid gap-1 text-sm">其他連結網址<input name="socialUrl" type="url" placeholder="https://…" maxLength={2000} className={inputClass} /></label>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">參與作品{category === "voice_actor" ? "（選填）" : "（至少一部）"}</p><button type="button" disabled={works.length >= 20} onClick={() => setWorks([...works, emptyWork()])} className="text-sm text-primary hover:underline disabled:opacity-50">新增作品</button></div>
            <p className="mt-1 text-xs text-muted-foreground">可填音聲、遊戲、影片或其他作品；公開頁會顯示審核通過的作品。</p>
            {works.map((work, index) => <div key={index} className="mt-2 grid gap-2 rounded-lg border border-border/70 p-2 sm:grid-cols-2">
              <input aria-label={`作品名稱 ${index + 1}`} placeholder="作品名稱" maxLength={200} value={work.title} onChange={(e) => setWorks(works.map((item, i) => i === index ? { ...item, title: e.target.value } : item))} className={inputClass} />
              <input aria-label={`作品網址 ${index + 1}`} type="url" placeholder="作品網址 https://…" maxLength={2000} value={work.url} onChange={(e) => setWorks(works.map((item, i) => i === index ? { ...item, url: e.target.value } : item))} className={inputClass} />
              <select aria-label={`作品類型 ${index + 1}`} value={work.workType} onChange={(e) => setWorks(works.map((item, i) => i === index ? { ...item, workType: e.target.value } : item))} className={inputClass}><option value="audio">音聲</option><option value="game">遊戲</option><option value="video">影片</option><option value="other">其他</option></select>
              <input aria-label={`作品封面網址 ${index + 1}`} type="url" placeholder="封面圖片網址（選填）" maxLength={2000} value={work.coverUrl} onChange={(e) => setWorks(works.map((item, i) => i === index ? { ...item, coverUrl: e.target.value } : item))} className={inputClass} />
              {category === "voice_actor" && <input aria-label={`演出角色 ${index + 1}`} placeholder="演出角色（選填）" maxLength={120} value={work.role} onChange={(e) => setWorks(works.map((item, i) => i === index ? { ...item, role: e.target.value } : item))} className={inputClass} />}
              {works.length > 1 && <button type="button" onClick={() => setWorks(works.filter((_, i) => i !== index))} className="text-xs text-muted-foreground hover:text-destructive">移除作品</button>}
            </div>)}
          </div>
          <label className="grid gap-1 text-sm">投稿人稱呼<input name="submitterName" required maxLength={120} className={inputClass} /></label><label className="grid gap-1 text-sm">聯絡 Email（不公開）<input name="contactEmail" type="email" required maxLength={320} className={inputClass} /></label>
          <input name="websiteTrap" tabIndex={-1} autoComplete="off" className="absolute -left-[9999px]" aria-hidden="true" />
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <div className="flex justify-end sm:col-span-2"><button type="submit" disabled={busy} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "送出中…" : "送出審核"}</button></div>
        </form>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
