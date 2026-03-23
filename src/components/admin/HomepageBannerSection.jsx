import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { MediaPicker } from "../ui/MediaPicker";
import { ImageCropDialog } from "../ui/ImageCropDialog";
import { getImageUploadGuide, MEDIA_FILE_ACCEPT, optimizeImageForUpload } from "../../lib/mediaLibrary";
import { uploadMediaObject } from "../../lib/api/media";
import { getHomepageBannerAdmin, updateHomepageBannerAdmin } from "../../lib/api/admin";

export function HomepageBannerSection() {
  const [homepageBannerItems, setHomepageBannerItems] = useState([]);
  const [isSavingHomepageBanner, setIsSavingHomepageBanner] = useState(false);
  const [homepageBannerError, setHomepageBannerError] = useState("");
  const [homepageBannerStatus, setHomepageBannerStatus] = useState("");
  const [homepageBannerPickerIndex, setHomepageBannerPickerIndex] = useState(null);
  const [homepageBannerApiCheckResult, setHomepageBannerApiCheckResult] = useState("");
  const [homepageBannerCropOpen, setHomepageBannerCropOpen] = useState(false);
  const [homepageBannerCropSource, setHomepageBannerCropSource] = useState(null);
  const [homepageBannerCropIndex, setHomepageBannerCropIndex] = useState(null);
  const homepageBannerGuide = useMemo(() => getImageUploadGuide("banner"), []);

  const loadHomepageBanner = async () => {
    try {
      const payload = await getHomepageBannerAdmin();
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      if (rows.length > 0) {
        setHomepageBannerItems(rows.map((item, idx) => ({
          id: String(item?.id || `slide-${idx + 1}`),
          title: String(item?.title || ""),
          content: String(item?.content || ""),
          link: String(item?.link || ""),
          imageUrl: String(item?.imageUrl || ""),
        })));
      } else {
        const fallback = {
          id: "slide-1",
          title: String(payload?.title || ""),
          content: String(payload?.content || ""),
          link: String(payload?.link || ""),
          imageUrl: String(payload?.imageUrl || ""),
        };
        setHomepageBannerItems(
          (fallback.title || fallback.content || fallback.link || fallback.imageUrl) ? [fallback] : []
        );
      }
      setHomepageBannerStatus("");
    } catch (error) {
      console.error("Failed to load homepage banner", error);
      setHomepageBannerStatus("載入首頁 Banner 設定失敗，請確認後端已部署最新版本。");
    }
  };

  useEffect(() => { loadHomepageBanner(); }, []);

  const handleSaveHomepageBanner = async () => {
    setIsSavingHomepageBanner(true);
    setHomepageBannerError("");
    setHomepageBannerStatus("");
    try {
      const sanitizedItems = (homepageBannerItems || []).map((item, idx) => ({
        id: String(item?.id || `slide-${idx + 1}`),
        title: String(item?.title || "").trim(),
        content: String(item?.content || "").trim(),
        link: String(item?.link || "").trim(),
        imageUrl: String(item?.imageUrl || "").trim(),
      })).filter((item) => item.title || item.content || item.link || item.imageUrl);
      await updateHomepageBannerAdmin({ items: sanitizedItems });
      const reloaded = await getHomepageBannerAdmin();
      const reloadedItems = Array.isArray(reloaded?.items) ? reloaded.items : [];
      if (sanitizedItems.length > 1 && reloadedItems.length <= 1) {
        setHomepageBannerItems(reloadedItems.length ? reloadedItems : sanitizedItems);
        setHomepageBannerError("目前後端仍為舊版（未支援 items 多張儲存）。請重新部署最新後端後再試。");
        return;
      }
      setHomepageBannerItems(reloadedItems.length > 0 ? reloadedItems : sanitizedItems);
      setHomepageBannerStatus("首頁 Banner 已儲存。");
    } catch (error) {
      setHomepageBannerError(error?.message || "儲存首頁 Banner 失敗");
    } finally {
      setIsSavingHomepageBanner(false);
    }
  };

  const addHomepageBannerItem = () => {
    setHomepageBannerItems((prev) => [
      ...prev,
      { id: `slide-${Date.now()}`, title: "", content: "", link: "", imageUrl: "" },
    ]);
  };

  const updateHomepageBannerItem = (index, field, value) => {
    setHomepageBannerItems((prev) => prev.map((item, idx) => (
      idx === index ? { ...item, [field]: value } : item
    )));
  };

  const removeHomepageBannerItem = (index) => {
    setHomepageBannerItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const applyHomepageBannerUpload = async (index, file) => {
    if (!file || index === null || index === undefined) return;
    setHomepageBannerError("");
    setHomepageBannerStatus("");
    try {
      const optimized = await optimizeImageForUpload(file, "banner");
      if (!optimized?.ok || !optimized?.file) throw new Error(optimized?.error || "圖片處理失敗");
      const uploaded = await uploadMediaObject(optimized.file, "banner");
      const url = String(uploaded?.url || "").trim();
      if (!url) throw new Error("上傳成功但沒有取得圖片網址");
      updateHomepageBannerItem(index, "imageUrl", url);
    } catch (error) {
      setHomepageBannerError(error?.message || "Banner 圖片上傳失敗");
    }
  };

  const handleHomepageBannerUpload = async (index, event) => {
    const file = event?.target?.files?.[0];
    if (event?.target) event.target.value = "";
    if (!file) return;
    setHomepageBannerCropIndex(index);
    setHomepageBannerCropSource({ file, name: file.name });
    setHomepageBannerCropOpen(true);
  };

  const checkHomepageBannerApiVersion = async () => {
    setHomepageBannerApiCheckResult("檢查中...");
    try {
      const payload = await getHomepageBannerAdmin();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      if (items.length > 1) {
        setHomepageBannerApiCheckResult("目前後端支援多張 Banner（items）。");
      } else if (items.length === 1) {
        setHomepageBannerApiCheckResult("目前後端可讀取 items，但資料目前僅 1 張。");
      } else if (payload && "items" in payload) {
        setHomepageBannerApiCheckResult("目前後端支援 items，但尚未儲存資料。");
      } else {
        setHomepageBannerApiCheckResult("目前後端看起來是舊版（未回傳 items）。");
      }
    } catch (error) {
      setHomepageBannerApiCheckResult(error?.message || "檢查失敗");
    }
  };

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">首頁 Banner 設定</CardTitle>
          <CardDescription>公開首頁跑馬燈可顯示多則活動公告（標題 / 內容 / 連結 / 圖片）。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">目前 {homepageBannerItems.length} 張</div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={checkHomepageBannerApiVersion}>
                檢查 API 版本
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addHomepageBannerItem}>
                新增一張 Banner
              </Button>
            </div>
          </div>
          {homepageBannerApiCheckResult && (
            <div className="text-xs text-muted-foreground">{homepageBannerApiCheckResult}</div>
          )}
          {homepageBannerItems.length === 0 && (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              尚未設定 Banner。可新增後儲存，公開首頁即會顯示輪播。
            </div>
          )}
          {homepageBannerItems.map((item, idx) => (
            <div key={item.id || idx} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">第 {idx + 1} 張</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeHomepageBannerItem(idx)}
                >
                  刪除
                </Button>
              </div>
              <Input placeholder="標題" value={item.title} onChange={(e) => updateHomepageBannerItem(idx, "title", e.target.value)} />
              <Textarea placeholder="內容" value={item.content} onChange={(e) => updateHomepageBannerItem(idx, "content", e.target.value)} rows={3} />
              <Input placeholder="連結（https://...）" value={item.link} onChange={(e) => updateHomepageBannerItem(idx, "link", e.target.value)} />
              <Input placeholder="圖片網址（可手動貼上）" value={item.imageUrl} onChange={(e) => updateHomepageBannerItem(idx, "imageUrl", e.target.value)} />
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                  上傳圖片
                  <input
                    type="file"
                    accept={MEDIA_FILE_ACCEPT}
                    className="hidden"
                    onChange={(event) => handleHomepageBannerUpload(idx, event)}
                  />
                </label>
                <Button type="button" variant="secondary" size="sm" onClick={() => setHomepageBannerPickerIndex(idx)}>
                  從媒體庫選擇
                </Button>
              </div>
              <div className="space-y-0.5 text-[11px] text-muted-foreground">
                <p>{homepageBannerGuide.supported}</p>
                <p>{homepageBannerGuide.recommended}</p>
              </div>
              {item.imageUrl && (
                <div className="overflow-hidden rounded-md border bg-muted/20">
                  <img
                    src={item.imageUrl}
                    alt={item.title || `banner-${idx + 1}`}
                    className="h-32 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          ))}
          {homepageBannerError && <div className="text-xs text-destructive">{homepageBannerError}</div>}
          {homepageBannerStatus && <div className="text-xs text-muted-foreground">{homepageBannerStatus}</div>}
          <div className="flex justify-end">
            <Button onClick={handleSaveHomepageBanner} disabled={isSavingHomepageBanner}>
              {isSavingHomepageBanner ? "儲存中..." : "儲存首頁 Banner"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <MediaPicker
        open={homepageBannerPickerIndex !== null}
        onOpenChange={(open) => { if (!open) setHomepageBannerPickerIndex(null); }}
        cropPurpose="banner"
        onSelect={(url) => {
          if (homepageBannerPickerIndex !== null) {
            updateHomepageBannerItem(homepageBannerPickerIndex, "imageUrl", url);
            setHomepageBannerPickerIndex(null);
          }
        }}
      />
      <ImageCropDialog
        open={homepageBannerCropOpen}
        onOpenChange={setHomepageBannerCropOpen}
        source={homepageBannerCropSource}
        purpose="banner"
        onConfirm={async (croppedFile) => {
          if (homepageBannerCropIndex === null) return;
          await applyHomepageBannerUpload(homepageBannerCropIndex, croppedFile);
          setHomepageBannerCropIndex(null);
        }}
      />
    </>
  );
}
