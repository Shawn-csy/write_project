import React from "react";
import { optimizeImageForUpload, getImageUploadGuide } from "../../lib/mediaLibrary";
import { uploadMediaObject } from "../../lib/api/media";

interface Props {
  setCoverUrl: (value: string) => void;
  setCoverCrop?: (value: { cx?: number; cy?: number; zoom?: number } | null) => void;
}

export function useMetadataCoverUpload({ setCoverUrl, setCoverCrop }: Props) {
  const [coverPreviewFailed, setCoverPreviewFailed] = React.useState(false);
  const [coverUploadError, setCoverUploadError] = React.useState("");
  const [coverUploadWarning, setCoverUploadWarning] = React.useState("");
  const [isMediaPickerOpen, setIsMediaPickerOpen] = React.useState(false);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropSource, setCropSource] = React.useState<{ file: File; name: string } | null>(null);
  const coverGuide = React.useMemo(() => getImageUploadGuide("cover"), []);

  const applyCoverUpload = async (file: File): Promise<void> => {
    const optimized = await optimizeImageForUpload(file, "cover");
    if (!optimized.ok || !optimized.file) {
      setCoverUploadError(optimized.error || "圖片格式不正確。");
      setCoverUploadWarning("");
      return;
    }
    try {
      const uploaded = await uploadMediaObject(optimized.file, "cover");
      const nextUrl = String(uploaded?.url || "").trim();
      if (!nextUrl) throw new Error("上傳失敗。");
      setCoverUploadError("");
      setCoverUploadWarning(optimized.warning || "");
      setCoverUrl(nextUrl);
      setCoverCrop?.(null);
      setCoverPreviewFailed(false);
    } catch (error: unknown) {
      setCoverUploadError(error instanceof Error ? error.message : "上傳失敗。");
      setCoverUploadWarning("");
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCropSource({ file, name: file.name });
    setCropOpen(true);
    event.target.value = "";
  };

  const handleMediaPickerSelect = (url: string) => {
    setCoverUrl(url);
    setCoverCrop?.(null);
    setCoverPreviewFailed(false);
    setCoverUploadError("");
    setCoverUploadWarning("");
  };

  const handleMediaPickerSelectMedia = (selection: { url: string; crop: { cx?: number; cy?: number; zoom?: number } | null }) => {
    setCoverUrl(selection.url);
    setCoverCrop?.(selection.crop || null);
    setCoverPreviewFailed(false);
    setCoverUploadError("");
    setCoverUploadWarning("");
  };

  return {
    coverPreviewFailed, setCoverPreviewFailed,
    coverUploadError, coverUploadWarning,
    isMediaPickerOpen, setIsMediaPickerOpen,
    cropOpen, setCropOpen, cropSource,
    coverGuide,
    applyCoverUpload, handleCoverUpload, handleMediaPickerSelect, handleMediaPickerSelectMedia,
  };
}
