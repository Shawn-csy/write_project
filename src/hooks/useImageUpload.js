import { useState, useCallback } from "react";
import { optimizeImageForUpload, uploadMediaObject } from "../lib/mediaLibrary";

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
export function useImageUpload({ ruleKey, purpose, onSuccess } = {}) {
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadWarning, setUploadWarning] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);

  const handleFileInputChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCropSource({ file, name: file.name });
    setCropOpen(true);
    event.target.value = "";
  }, []);

  const applyCroppedUpload = useCallback(async (file) => {
    const optimized = await optimizeImageForUpload(file, ruleKey);
    if (!optimized.ok) {
      setUploadError(optimized.error || "圖片格式不正確。");
      setUploadWarning("");
      return;
    }
    try {
      const uploaded = await uploadMediaObject(optimized.file, purpose ?? ruleKey);
      const url = String(uploaded?.url || "").trim();
      if (!url) throw new Error("上傳失敗。");
      setUploadError("");
      setUploadWarning(optimized.warning || "");
      setPreviewFailed(false);
      onSuccess?.(url);
    } catch (error) {
      setUploadError(error?.message || "上傳失敗。");
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
