import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { MediaPicker } from "../ui/MediaPicker";
import { ImageCropDialog } from "../ui/ImageCropDialog";
import { getImageUploadGuide, MEDIA_FILE_ACCEPT, optimizeImageForUpload } from "../../lib/mediaLibrary";
import { uploadMediaObject } from "../../lib/api/media";
import { getHomepageBannerAdmin, updateHomepageBannerAdmin } from "../../lib/api/admin";
import { canApplyPersistentCropRef } from "../../lib/mediaCropRef";
import {
  buildHomepageHeroPlacementModel,
  buildHomepageHeroPreviewFrames,
  resolveHeroPreviewImageStyle,
  validateHomepageHeroPlacement,
} from "../../lib/admin/homepageHeroModel";
import type { MediaSelection } from "../ui/MediaPicker";
import type { HomepageBannerItem } from "../../types/api";
import type { HeroPreviewViewport } from "../../lib/admin/homepageHeroModel";

type CropFieldKey = "imageCrop" | "imageMobileCrop" | "imageDesktopCrop" | "imageUltraWideCrop";

interface CropSource {
  file?: File;
  url?: string;
  name: string;
  initialCropRef?: { cx?: number; cy?: number; zoom?: number } | null;
}

interface ErrorWithMessage {
  message?: string;
}

interface HomepageBannerResponse {
  title?: string;
  content?: string;
  link?: string;
  imageUrl?: string;
  items?: HomepageBannerItem[];
}

const VIEWPORT_CROP_FIELDS: Array<{
  viewport: HeroPreviewViewport;
  cropKey: CropFieldKey;
  label: string;
}> = [
  { viewport: "mobile", cropKey: "imageMobileCrop", label: "手機焦點" },
  { viewport: "desktop", cropKey: "imageDesktopCrop", label: "桌面焦點" },
  { viewport: "ultra-wide", cropKey: "imageUltraWideCrop", label: "超寬焦點" },
];

function itemToHomepageBannerItem(item: HomepageBannerItem, idx: number): HomepageBannerItem {
  return {
    id: String(item?.id || `slide-${idx + 1}`),
    title: String(item?.title || ""),
    content: String(item?.content || ""),
    link: String(item?.link || ""),
    imageUrl: String(item?.imageUrl || ""),
    imageAlt: String(item?.imageAlt || ""),
    imageCrop: item?.imageCrop ?? null,
    imageMobileCrop: item?.imageMobileCrop ?? null,
    imageDesktopCrop: item?.imageDesktopCrop ?? null,
    imageUltraWideCrop: item?.imageUltraWideCrop ?? null,
    imageBackgroundMode: item?.imageBackgroundMode ?? undefined,
  };
}

export function HomepageBannerSection() {
  const [items, setItems] = useState<HomepageBannerItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [cropOpen, setCropOpen] = useState<boolean>(false);
  const [cropSource, setCropSource] = useState<CropSource | null>(null);
  const [cropIndex, setCropIndex] = useState<number | null>(null);
  const [cropField, setCropField] = useState<CropFieldKey>("imageCrop");
  const [previewViewports, setPreviewViewports] = useState<Record<number, HeroPreviewViewport>>({});
  const guide = useMemo(() => getImageUploadGuide("banner"), []);

  const loadBanner = async (): Promise<void> => {
    try {
      const payload = await getHomepageBannerAdmin() as HomepageBannerResponse;
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      if (rows.length > 0) {
        setItems(rows.map((item, idx) => itemToHomepageBannerItem(item as HomepageBannerItem, idx)));
      } else {
        const fallback: HomepageBannerItem = {
          id: "slide-1",
          title: String(payload?.title || ""),
          content: String(payload?.content || ""),
          link: String(payload?.link || ""),
          imageUrl: String(payload?.imageUrl || ""),
        };
        setItems((fallback.title || fallback.content || fallback.link || fallback.imageUrl) ? [fallback] : []);
      }
      setStatus("");
    } catch (err: unknown) {
      console.error("Failed to load homepage banner", err);
      setStatus("載入首頁 Banner 設定失敗，請確認後端已部署最新版本。");
    }
  };

  useEffect(() => { loadBanner(); }, []);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    setError("");
    setStatus("");
    try {
      // Filter empty/blank slides first — only non-empty slides are validated and sent.
      const sanitized = items
        .map((item, idx) => ({
          ...item,
          id: String(item?.id || `slide-${idx + 1}`),
          title: String(item?.title || "").trim(),
          content: String(item?.content || "").trim(),
          link: String(item?.link || "").trim(),
          imageUrl: String(item?.imageUrl || "").trim(),
          imageAlt: String(item?.imageAlt || "").trim(),
        }))
        .filter((item) => item.title || item.content || item.link || item.imageUrl);
      // Block if any publishable slide has placement errors (missing imageUrl or backgroundMode).
      const blockingSlides = sanitized.filter((item) => {
        const model = buildHomepageHeroPlacementModel(item);
        return validateHomepageHeroPlacement(model).some((i) => i.severity === "error");
      });
      if (blockingSlides.length > 0) {
        setError(`部分 Banner 有必填項目尚未完成，請選擇顯示模式並填入圖片網址後再儲存。`);
        setIsSaving(false);
        return;
      }
      await updateHomepageBannerAdmin({ items: sanitized });
      const reloaded = await getHomepageBannerAdmin() as HomepageBannerResponse;
      const reloadedItems = Array.isArray(reloaded?.items) ? reloaded.items as HomepageBannerItem[] : [];
      if (sanitized.length > 1 && reloadedItems.length <= 1) {
        setItems(reloadedItems.length ? reloadedItems : sanitized);
        setError("目前後端仍為舊版（未支援 items 多張儲存）。請重新部署最新後端後再試。");
        return;
      }
      setItems(reloadedItems.length > 0 ? reloadedItems : sanitized);
      setStatus("首頁 Banner 已儲存。");
    } catch (err: unknown) {
      const typedError = err as ErrorWithMessage;
      setError(typedError.message || "儲存首頁 Banner 失敗");
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = (): void => {
    setItems((prev) => [
      ...prev,
      { id: `slide-${Date.now()}`, title: "", content: "", link: "", imageUrl: "" },
    ]);
  };

  const updateItem = (index: number, patch: Partial<HomepageBannerItem>): void => {
    setItems((prev) => prev.map((item, idx) => idx === index ? { ...item, ...patch } : item));
  };

  const removeItem = (index: number): void => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const applyUpload = async (index: number, file: File): Promise<void> => {
    setError("");
    setStatus("");
    try {
      const optimized = await optimizeImageForUpload(file, "banner");
      if (!optimized?.ok || !optimized?.file) throw new Error(optimized?.error || "圖片處理失敗");
      const uploaded = await uploadMediaObject(optimized.file, "banner");
      const url = String((uploaded as { url?: string } | null)?.url || "").trim();
      if (!url) throw new Error("上傳成功但沒有取得圖片網址");
      updateItem(index, { imageUrl: url, imageCrop: null, imageMobileCrop: null, imageDesktopCrop: null, imageUltraWideCrop: null });
    } catch (err: unknown) {
      const typedError = err as ErrorWithMessage;
      setError(typedError.message || "Banner 圖片上傳失敗");
    }
  };

  const handleFileUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCropIndex(index);
    setCropField("imageCrop");
    setCropSource({ file, name: file.name });
    setCropOpen(true);
  };

  const openCrop = (index: number, field: CropFieldKey): void => {
    const item = items[index];
    if (!item?.imageUrl) return;
    setCropIndex(index);
    setCropField(field);
    setCropSource({
      url: item.imageUrl,
      name: `banner-${index + 1}`,
      initialCropRef: item[field] ?? null,
    });
    setCropOpen(true);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">目前 {items.length} 張</div>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            新增一張 Banner
          </Button>
        </div>
        {items.length === 0 && (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            尚未設定 Banner。可新增後儲存，公開首頁即會顯示輪播。
          </div>
        )}
        {items.map((item, idx) => {
          const model = buildHomepageHeroPlacementModel(item);
          const issues = validateHomepageHeroPlacement(model);
          const hasError = issues.some((i) => i.severity === "error");
          const warnings = issues.filter((i) => i.severity === "warning");
          return (
            <div key={item.id || idx} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">第 {idx + 1} 張</div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(idx)}
                >
                  刪除
                </Button>
              </div>

              {/* Identity fields */}
              <Input
                placeholder="標題"
                value={item.title ?? ""}
                onChange={(e) => updateItem(idx, { title: e.target.value })}
              />
              <Textarea
                placeholder="內容"
                value={item.content ?? ""}
                onChange={(e) => updateItem(idx, { content: e.target.value })}
                rows={3}
              />
              <Input
                placeholder="連結（https://...）"
                value={item.link ?? ""}
                onChange={(e) => updateItem(idx, { link: e.target.value })}
              />

              {/* Image URL */}
              <Input
                placeholder="圖片網址（可手動貼上）"
                value={item.imageUrl ?? ""}
                onChange={(e) => updateItem(idx, { imageUrl: e.target.value, imageCrop: null, imageMobileCrop: null, imageDesktopCrop: null, imageUltraWideCrop: null })}
              />

              {/* Alt text */}
              <Input
                placeholder="圖片替代文字（無障礙，非裝飾圖必填）"
                value={item.imageAlt ?? ""}
                onChange={(e) => updateItem(idx, { imageAlt: e.target.value })}
              />

              {/* Background mode */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">顯示模式</span>
                {(["cover", "blur-fill"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateItem(idx, { imageBackgroundMode: mode })}
                    className={`rounded-md border px-3 py-1 text-xs transition-colors ${
                      item.imageBackgroundMode === mode
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {mode === "cover" ? "裁切填滿" : "模糊補邊"}
                  </button>
                ))}
                {!item.imageBackgroundMode && (
                  <span className="text-[11px] text-destructive">（必選）</span>
                )}
              </div>

              {/* Image actions */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs hover:bg-muted">
                  上傳圖片
                  <input
                    type="file"
                    accept={MEDIA_FILE_ACCEPT}
                    className="hidden"
                    onChange={(e) => handleFileUpload(idx, e)}
                  />
                </label>
                <Button type="button" variant="secondary" size="sm" onClick={() => setPickerIndex(idx)}>
                  從媒體庫選擇
                </Button>
              </div>

              {/* Per-viewport crop buttons */}
              {canApplyPersistentCropRef(item.imageUrl ?? "") && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openCrop(idx, "imageCrop")}
                  >
                    通用焦點
                  </Button>
                  {VIEWPORT_CROP_FIELDS.map(({ cropKey, label }) => (
                    <Button
                      key={cropKey}
                      type="button"
                      variant={item[cropKey] ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => openCrop(idx, cropKey)}
                    >
                      {label}{item[cropKey] ? " ✓" : ""}
                    </Button>
                  ))}
                </div>
              )}

              <div className="space-y-0.5 text-[11px] text-muted-foreground">
                <p>{guide.supported}</p>
                <p>{guide.recommended}</p>
              </div>

              {/* Readiness panel */}
              {issues.length > 0 && (
                <div className={`rounded-md border p-2 space-y-1 text-[11px] ${hasError ? "border-destructive/50 bg-destructive/5" : "border-yellow-400/40 bg-yellow-50/10"}`}>
                  {issues.map((issue) => (
                    <p key={issue.code} className={issue.severity === "error" ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"}>
                      {issue.severity === "error" ? "✗" : "!"} {issue.message}
                    </p>
                  ))}
                </div>
              )}

              {/* Viewport preview panel */}
              {item.imageUrl && (() => {
                const frames = buildHomepageHeroPreviewFrames(model);
                const activeVp: HeroPreviewViewport = previewViewports[idx] ?? "desktop";
                const frame = frames.find((f) => f.viewport === activeVp)!;
                const VP_LABELS: Record<HeroPreviewViewport, string> = {
                  mobile: "手機 390×220",
                  desktop: "桌面 1440×450",
                  "ultra-wide": "超寬 2560×800",
                };
                // Scale preview frame to fit ~320px width while keeping aspect ratio.
                const previewW = 320;
                const previewH = Math.round((frame.height / frame.width) * previewW);
                const isBlurFill = item.imageBackgroundMode === "blur-fill";

                // blur-fill bg layer crop: mirrors HeroImage.tsx line 102.
                // Overscan=1.4 matches public overscanScale={1.4} on PublicImage bg layer.
                // blur(24px) = blur-xl; opacity 0.6 = opacity-60.
                const bgCrop = model.ultraWideCrop ?? model.desktopCrop ?? model.crop;

                return (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {(["mobile", "desktop", "ultra-wide"] as HeroPreviewViewport[]).map((vp) => (
                        <button
                          key={vp}
                          type="button"
                          onClick={() => setPreviewViewports((prev) => ({ ...prev, [idx]: vp }))}
                          className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                            activeVp === vp
                              ? "bg-primary text-primary-foreground"
                              : "border border-input bg-background hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {vp === "mobile" ? "手機" : vp === "desktop" ? "桌面" : "超寬"}
                        </button>
                      ))}
                      <span className="ml-auto text-[10px] text-muted-foreground self-center">{VP_LABELS[activeVp]}</span>
                    </div>
                    <div
                      className="relative overflow-hidden rounded-md border bg-black"
                      style={{ width: previewW, height: previewH }}
                    >
                      {isBlurFill && (
                        <img
                          src={item.imageUrl}
                          alt=""
                          aria-hidden
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{ filter: "blur(24px)", opacity: 0.6, ...resolveHeroPreviewImageStyle(bgCrop, 1.4) }}
                        />
                      )}
                      <img
                        src={item.imageUrl}
                        alt={item.imageAlt || item.title || `banner-${idx + 1}`}
                        className="absolute inset-0 h-full w-full"
                        style={{
                          objectFit: isBlurFill ? "contain" : "cover",
                          ...resolveHeroPreviewImageStyle(frame.effectiveCrop),
                        }}
                        loading="lazy"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
        {error && <div className="text-xs text-destructive">{error}</div>}
        {status && <div className="text-xs text-muted-foreground">{status}</div>}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "儲存中..." : "儲存首頁 Banner"}
          </Button>
        </div>
      </div>

      <MediaPicker
        open={pickerIndex !== null}
        onOpenChange={(open) => { if (!open) setPickerIndex(null); }}
        cropPurpose="banner"
        onSelect={(url) => {
          if (pickerIndex !== null) {
            // Clear all crops when image changes — crop refs are image-specific.
            // imageBackgroundMode is intentionally retained: it is placement intent, not image-specific.
            updateItem(pickerIndex, { imageUrl: url, imageCrop: null, imageMobileCrop: null, imageDesktopCrop: null, imageUltraWideCrop: null });
            setPickerIndex(null);
          }
        }}
        onSelectMedia={(selection: MediaSelection) => {
          if (pickerIndex !== null) {
            // Same as onSelect: clear viewport crops, retain mode.
            updateItem(pickerIndex, { imageUrl: selection.url, imageCrop: selection.crop ?? null, imageMobileCrop: null, imageDesktopCrop: null, imageUltraWideCrop: null });
            setPickerIndex(null);
          }
        }}
      />
      <ImageCropDialog
        open={cropOpen}
        onOpenChange={setCropOpen}
        source={cropSource}
        purpose="banner"
        onConfirm={async (croppedFile) => {
          if (cropIndex === null) return;
          await applyUpload(cropIndex, croppedFile);
          setCropIndex(null);
        }}
        onApplyCropRef={cropSource?.url && cropIndex !== null
          ? (crop) => {
              updateItem(cropIndex!, { [cropField]: crop });
              setCropOpen(false);
              setCropIndex(null);
            }
          : undefined
        }
        applyCropRefLabel="套用裁切框"
        initialCropRef={cropSource?.url ? (cropSource.initialCropRef ?? null) : null}
      />
    </>
  );
}
