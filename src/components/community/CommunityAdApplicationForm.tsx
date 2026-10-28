import React, { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Megaphone } from "lucide-react";
import type { OrgData, PersonaLike } from "../../types/api";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { createPublicFeedback } from "../../lib/api/public";
import { uploadMediaObject } from "../../lib/api/media";
import { getImageUploadGuide, MEDIA_FILE_ACCEPT, optimizeImageForUpload } from "../../lib/mediaLibrary";

interface CommunityAdApplicationFormProps {
  personas: PersonaLike[];
  organizations: OrgData[];
  contactName: string;
  contactEmail: string;
  onOpenProfiles: () => void;
}

interface ApplicationEntity {
  key: string;
  label: string;
}

export function CommunityAdApplicationForm({
  personas,
  organizations,
  contactName,
  contactEmail,
  onOpenProfiles,
}: CommunityAdApplicationFormProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [entityKey, setEntityKey] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [success, setSuccess] = useState("");

  const entities = useMemo<ApplicationEntity[]>(() => [
    ...personas.filter((persona) => persona.id).map((persona) => ({
      key: `persona:${persona.id}`,
      label: `作者｜${persona.displayName || "未命名身份"}`,
    })),
    ...organizations.filter((organization) => organization.id).map((organization) => ({
      key: `organization:${organization.id}`,
      label: `組織｜${organization.name || "未命名組織"}`,
    })),
  ], [organizations, personas]);

  useEffect(() => {
    if (!entityKey && entities[0]) setEntityKey(entities[0].key);
  }, [entities, entityKey]);

  const imageGuide = getImageUploadGuide("banner");

  const handleBannerFile = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setUploadError("");
    try {
      const optimized = await optimizeImageForUpload(file, "banner");
      if (!optimized.ok || !("file" in optimized) || !optimized.file) {
        setUploadError(("error" in optimized && optimized.error) || "無法處理這張圖片。");
        return;
      }
      const uploaded = await uploadMediaObject(optimized.file, "banner");
      const url = String(uploaded?.url || "").trim();
      if (!url) throw new Error("上傳完成但沒有取得圖片網址。");
      setBannerUrl(url);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "圖片上傳失敗，請重試。");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const selectedEntity = entities.find((entity) => entity.key === entityKey);
    if (!selectedEntity) {
      setError("請先建立作者身份或組織，再選擇申請單位。");
      return;
    }
    if (endDate && startDate && endDate < startDate) {
      setError("結束日期不能早於開始日期。");
      return;
    }
    try {
      const parsedTarget = new URL(targetUrl);
      if (parsedTarget.protocol !== "https:" && parsedTarget.protocol !== "http:") throw new Error();
    } catch {
      setError("請填寫有效的導流網址。");
      return;
    }

    setIsSubmitting(true);
    try {
      const content = [
        "廣告申請",
        `申請單位：${selectedEntity.label}`,
        `活動／品牌名稱：${campaignName.trim()}`,
        `導流網址：${targetUrl.trim()}`,
        `預計期間：${startDate || "未指定"} 至 ${endDate || "未指定"}`,
        `Banner 圖片：${bannerUrl.trim()}`,
        "合作說明：",
        notes.trim() || "未提供",
      ].join("\n");

      const result = await createPublicFeedback({
        kind: "ad_application",
        contactName: contactName || selectedEntity.label,
        contactEmail,
        content,
        pageUrl: `${window.location.origin}/community?tab=advertising`,
      });
      setSuccess(`申請已送出${result.feedbackId ? `，編號 ${result.feedbackId}` : ""}。`);
      setCampaignName("");
      setTargetUrl("");
      setStartDate("");
      setEndDate("");
      setBannerUrl("");
      setNotes("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "申請送出失敗，請稍後重試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!entities.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" />廣告申請</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">先建立作者身份或組織，才能用該名義提出申請。</p>
          <Button variant="outline" onClick={onOpenProfiles}>前往作者與組織</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base"><Megaphone className="h-4 w-4" />廣告申請</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-1.5 text-sm">
            <span>申請單位</span>
            <select
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
              value={entityKey}
              onChange={(event) => setEntityKey(event.target.value)}
              required
            >
              {entities.map((entity) => <option key={entity.key} value={entity.key}>{entity.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span>活動／品牌名稱</span>
            <Input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} maxLength={160} required />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span>導流網址</span>
            <Input type="url" inputMode="url" placeholder="https://…" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} required />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span>開始日期</span>
            <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span>結束日期</span>
            <Input type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <div className="grid gap-2 md:col-span-2">
            <span className="text-sm">Banner 圖片</span>
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileInputRef} type="file" accept={MEDIA_FILE_ACCEPT} className="sr-only" onChange={(event) => void handleBannerFile(event)} />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                上傳圖片
              </Button>
              <span className="text-xs text-muted-foreground">{imageGuide.recommended}；{imageGuide.supported}</span>
            </div>
            {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
            <Input type="url" inputMode="url" placeholder="或貼上圖片網址 https://…" value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} required />
            {bannerUrl && <img src={bannerUrl} alt="廣告 Banner 預覽" className="max-h-48 w-fit max-w-full rounded-lg border object-contain" />}
          </div>
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span>合作說明</span>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={4} placeholder="簡述活動內容、希望曝光的對象或其他需求" />
          </label>
          {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
          {success && <p className="text-sm text-emerald-600 md:col-span-2">{success}</p>}
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              送出申請
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
