import { useState, useCallback } from "react";
import type React from "react";
import { optimizeImageForUpload } from "../lib/mediaLibrary";
import { uploadMediaObject } from "../lib/api/media";

interface UseImageUploadOptions {
  ruleKey?: "avatar" | "banner" | "cover" | "logo";
  purpose?: string;
  onSuccess?: (url: string) => void;
}

interface CropSource {
  file: File;
  name: string;
}

interface UseImageUploadResult {
  cropOpen: boolean;
  setCropOpen: React.Dispatch<React.SetStateAction<boolean>>;
  cropSource: CropSource | null;
  setCropSource: React.Dispatch<React.SetStateAction<CropSource | null>>;
  cropPurpose: string | undefined;
  uploadError: string;
  uploadWarning: string;
  previewFailed: boolean;
  setPreviewFailed: React.Dispatch<React.SetStateAction<boolean>>;
  handleFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  applyCroppedUpload: (file: File) => Promise<void>;
}

/**
 * useImageUpload
 *
 * 管理單一圖像欄位的上傳、裁剪狀態與錯誤訊息。
 *
 * @param {object} options
 * @param {string} options.ruleKey   - 傳給 optimizeImageForUpload 的規則鍵（"avatar" | "banner" | "cover"）
 * @param {string} options.purpose   - 傳給 uploadMediaObject 的 purpose（通常同 ruleKey）
 * @param {function} options.onSuccess - 上傳成功後的 callback(url)
 *
 * @returns {{
 *   cropOpen, setCropOpen,
 *   cropSource, setCropSource,
 *   cropPurpose,
 *   uploadError, uploadWarning, previewFailed, setPreviewFailed,
 *   handleFileInputChange,
 *   applyCroppedUpload,
 * }}
 */
export function useImageUpload({ ruleKey, purpose, onSuccess }: UseImageUploadOptions = {}): UseImageUploadResult {
  const [cropOpen, setCropOpen] = useState<boolean>(false);
  const [cropSource, setCropSource] = useState<CropSource | null>(null);
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadWarning, setUploadWarning] = useState<string>("");
  const [previewFailed, setPreviewFailed] = useState<boolean>(false);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCropSource({ file, name: file.name });
    setCropOpen(true);
    event.target.value = "";
  }, []);

  const applyCroppedUpload = useCallback(async (file: File) => {
    const optimized = await optimizeImageForUpload(file, ruleKey);
    const optimizedFile = "file" in optimized ? optimized.file : undefined;
    if (!optimized.ok || !optimizedFile) {
      const errorMessage = !optimized.ok ? optimized.error : "圖片格式不正確。";
      setUploadError(errorMessage || "圖片格式不正確。");
      setUploadWarning("");
      return;
    }
    try {
      const uploaded = await uploadMediaObject(optimizedFile, purpose ?? ruleKey ?? "generic");
      const url = String(uploaded?.url || "").trim();
      if (!url) throw new Error("上傳失敗。");
      setUploadError("");
      setUploadWarning(optimized.warning || "");
      setPreviewFailed(false);
      onSuccess?.(url);
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : "上傳失敗。");
      setUploadWarning("");
    }
  }, [ruleKey, purpose, onSuccess]);

  return {
    cropOpen,
    setCropOpen,
    cropSource,
    setCropSource,
    cropPurpose: ruleKey,
    uploadError,
    uploadWarning,
    previewFailed,
    setPreviewFailed,
    handleFileInputChange,
    applyCroppedUpload,
  };
}
