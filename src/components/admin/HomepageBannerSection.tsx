import React, { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { MediaPicker } from "../ui/MediaPicker";
import { MEDIA_FILE_ACCEPT, optimizeImageForUpload } from "../../lib/mediaLibrary";
import { uploadMediaObject } from "../../lib/api/media";
import {
  getAudioWorkBannerAdmin, getDemoBannerAdmin, getHomepageBannerAdmin,
  updateAudioWorkBannerAdmin, updateDemoBannerAdmin, updateHomepageBannerAdmin,
} from "../../lib/api/admin";
import type { HomepageBanner, HomepageBannerItem } from "../../types/api";

type Scope = "homepage" | "demos" | "audio-works";
const labels: Record<Scope, string> = { homepage: "首頁", demos: "Demo 頁", "audio-works": "音聲作品頁" };
const getters = { homepage: getHomepageBannerAdmin, demos: getDemoBannerAdmin, "audio-works": getAudioWorkBannerAdmin };
const setters = { homepage: updateHomepageBannerAdmin, demos: updateDemoBannerAdmin, "audio-works": updateAudioWorkBannerAdmin };
const fields = [
  ["title", "標題"], ["link", "連結"], ["imageUrl", "圖片網址"], ["imageAlt", "圖片替代文字"],
] as const;

export function HomepageBannerSection({ scope = "homepage" }: { scope?: Scope }) {
  const [items, setItems] = useState<HomepageBannerItem[]>([]);
  const [loadedScope, setLoadedScope] = useState<Scope | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const loaded = loadedScope === scope;

  useEffect(() => {
    let active = true;
    setStatus("");
    setError("");
    setItems([]);
    setLoadedScope(null);
    setPickerIndex(null);
    void getters[scope]().then((payload: HomepageBanner) => {
      if (!active) return;
      const rows = payload.items || [];
      setItems(rows.length ? rows : payload.title || payload.imageUrl || payload.content
        ? [{ ...payload, id: "slide-1" }]
        : []);
      setLoadedScope(scope);
    }).catch(() => {
      if (active) setError("載入 Banner 失敗。");
    });
    return () => { active = false; };
  }, [scope]);

  const update = (index: number, patch: Partial<HomepageBannerItem>) => {
    setItems((rows) => rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  };

  const save = async () => {
    if (!loaded) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      // Keep legacy placement/crop data intact while removing empty drafts.
      const rows = items.filter((item) => item.title || item.content || item.imageUrl || item.link);
      for (const item of rows) {
        if (item.startDate && item.endDate && item.endDate < item.startDate) {
          throw new Error("結束日期不能早於開始日期。");
        }
        if (item.link && !/^(https?:\/\/|\/(?!\/))/.test(item.link)) {
          throw new Error("連結請使用 HTTP(S) 網址或站內路徑。");
        }
      }
      const saved = await setters[scope]({ items: rows });
      setItems(saved.items || []);
      setStatus(`${labels[scope]} Banner 已儲存。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "儲存失敗。");
    } finally {
      setBusy(false);
    }
  };

  const upload = async (index: number, file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const optimized = await optimizeImageForUpload(file, "banner");
      if (!optimized.ok || !optimized.file) throw new Error(optimized.error || "圖片處理失敗");
      const result = await uploadMediaObject(optimized.file, "banner");
      if (!result.url) throw new Error("上傳後未取得圖片網址");
      update(index, { imageUrl: result.url });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "圖片上傳失敗");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {labels[scope]}廣告：完整圖片以 3:1 顯示（建議 1500 × 500），手機可左右滑動。
        舊裁切設定保留，公開橫幅不套用裁切。
      </p>
      <p className="text-xs text-muted-foreground">
        日期依台灣時間（Asia/Taipei），結束日期包含當日；留白即不限日期。
      </p>
      <Button variant="outline" size="sm" disabled={busy || !loaded}
        onClick={() => setItems((rows) => [...rows, { id: `slide-${Date.now()}`, placement: scope }])}>
        新增一張 Banner
      </Button>
      {!loaded && !error && <p role="status" className="text-xs">載入中…</p>}
      {loaded && items.length === 0 && (
        <p className="text-xs text-muted-foreground">尚未設定廣告，公開頁不顯示橫幅。</p>
      )}
      {loaded && items.map((item, index) => {
        const brand = scope === "homepage" && item.id === "brand-intro";
        return (
          <fieldset key={item.id} disabled={busy} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs">{brand ? "首頁品牌介紹（原資料保留）" : `第 ${index + 1} 張 Banner`}</span>
              <Button variant="ghost" size="sm"
                onClick={() => setItems((rows) => rows.filter((_, i) => i !== index))}>
                刪除
              </Button>
            </div>
            {brand && (
              <Input aria-label="品牌眉標" value={item.eyebrow || ""}
                onChange={(e) => update(index, { eyebrow: e.target.value })} />
            )}
            {fields.filter(([key]) => !brand || !key.startsWith("image")).map(([key, label]) => (
              <Input key={key} aria-label={label} placeholder={label} value={item[key] || ""}
                onChange={(e) => update(index, { [key]: e.target.value })} />
            ))}
            <Textarea aria-label="內容" placeholder="文字公告內容（無圖片時顯示）" value={item.content || ""}
              onChange={(e) => update(index, { content: e.target.value })} />
            {!brand && <>
              <div className="flex flex-wrap gap-2">
                {(["startDate", "endDate"] as const).map((key) => (
                  <label key={key} className="text-xs">
                    {key === "startDate" ? "開始日期" : "結束日期"}
                    <Input type="date" value={item[key] || ""}
                      onChange={(e) => update(index, { [key]: e.target.value || null })} />
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer rounded border px-3 py-1 text-xs">
                  上傳完整圖片
                  <input type="file" accept={MEDIA_FILE_ACCEPT} className="hidden" onChange={(e) => {
                    void upload(index, e.target.files?.[0]);
                    e.target.value = "";
                  }} />
                </label>
                <Button variant="secondary" size="sm" onClick={() => setPickerIndex(index)}>
                  從媒體庫選擇
                </Button>
              </div>
            </>}
            {brand ? (
              <div data-testid="brand-preview" className="relative aspect-[3/1] w-full overflow-hidden rounded-md border bg-primary text-primary-foreground">
                <div className="absolute inset-0 flex flex-col justify-center px-3 py-2 sm:px-5 sm:py-3">
                  <p className="text-[10px] leading-3 opacity-75 sm:text-xs sm:leading-4">{item.eyebrow}</p>
                  <strong className="mt-0.5 text-sm leading-tight sm:mt-1 sm:text-xl">{item.title}</strong>
                  <p className="mt-1 whitespace-pre-line text-[10px] leading-[1.35] opacity-85 sm:mt-2 sm:text-xs sm:leading-normal">{item.content}</p>
                </div>
              </div>
            ) : (
              <div data-testid="banner-preview" className="relative aspect-[3/1] w-full overflow-hidden rounded-md border bg-card">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.imageAlt || item.title || "Banner 預覽"}
                    className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <div className="absolute inset-0 flex flex-col justify-center bg-primary px-5 text-primary-foreground">
                    <strong className="line-clamp-2 text-lg sm:text-xl">{item.title}</strong>
                    <p className="mt-1 line-clamp-2 text-xs opacity-85 sm:text-sm">{item.content}</p>
                  </div>
                )}
              </div>
            )}
          </fieldset>
        );
      })}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {status && <p role="status" className="text-xs text-muted-foreground">{status}</p>}
      <Button disabled={busy || !loaded} onClick={() => void save()}>
        {busy ? "處理中…" : "儲存 Banner"}
      </Button>
      <MediaPicker open={pickerIndex !== null}
        onOpenChange={(open) => { if (!open) setPickerIndex(null); }}
        onSelect={(url: string) => {
          if (pickerIndex !== null) update(pickerIndex, { imageUrl: url });
          setPickerIndex(null);
        }} />
    </div>
  );
}
