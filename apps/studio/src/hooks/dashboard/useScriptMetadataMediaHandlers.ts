import { useCallback } from "react";
import { uploadMediaObject } from "../../lib/api/media";
import { optimizeImageForUpload } from "../../lib/mediaLibrary";
import type { MediaSelection } from "../../components/ui/MediaPicker";

interface MediaHandlerState {
    setCoverUrl: (url: string) => void;
    setCoverCrop: (crop: { cx?: number; cy?: number; zoom?: number } | null) => void;
    setCoverPreviewFailed: (v: boolean) => void;
    setCoverUploadError: (v: string) => void;
    setCoverUploadWarning: (v: string) => void;
    setActivityBannerUrl: (url: string) => void;
    setActivityBannerPreviewFailed: (v: boolean) => void;
    setActivityBannerUploadError: (v: string) => void;
    setActivityBannerUploadWarning: (v: string) => void;
    setIsMediaPickerOpen: (v: boolean) => void;
    setMediaPickerTarget: (v: string) => void;
    mediaPickerTarget: string;
    setCropSource: (v: { file?: File; url?: string; name: string; initialCropRef?: { cx?: number; cy?: number; zoom?: number } | null } | null) => void;
    setCropTarget: (v: string) => void;
    setCropPurpose: (v: "avatar" | "logo" | "cover" | "banner" | "generic") => void;
    setCropOpen: (v: boolean) => void;
    coverUrl: string;
    coverCrop?: { cx?: number; cy?: number; zoom?: number } | null;
}

export function useScriptMetadataMediaHandlers({
    setCoverUrl, setCoverCrop, setCoverPreviewFailed, setCoverUploadError, setCoverUploadWarning,
    setActivityBannerUrl, setActivityBannerPreviewFailed, setActivityBannerUploadError, setActivityBannerUploadWarning,
    setIsMediaPickerOpen, setMediaPickerTarget, mediaPickerTarget,
    setCropSource, setCropTarget, setCropPurpose, setCropOpen,
    coverUrl,
    coverCrop,
}: MediaHandlerState) {

    const applyCroppedUpload = useCallback(async (file: File, target: string) => {
        const ruleKey = target === "activityBanner" ? "banner" : "cover";
        const optimized = await optimizeImageForUpload(file, ruleKey);
        if (!optimized.ok) {
            if (target === "activityBanner") {
                setActivityBannerUploadError(optimized.error || "圖片格式不正確。");
                setActivityBannerUploadWarning("");
            } else {
                setCoverUploadError(optimized.error || "圖片格式不正確。");
                setCoverUploadWarning("");
            }
            return;
        }
        try {
            const uploaded = await uploadMediaObject(optimized.file as File, ruleKey);
            const nextUrl = String(uploaded?.url || "").trim();
            if (!nextUrl) throw new Error("上傳失敗。");
            if (target === "activityBanner") {
                setActivityBannerUploadError("");
                setActivityBannerUploadWarning(optimized.warning || "");
                setActivityBannerUrl(nextUrl);
                setActivityBannerPreviewFailed(false);
            } else {
                setCoverUploadError("");
                setCoverUploadWarning(optimized.warning || "");
                setCoverUrl(nextUrl);
                setCoverCrop(null);
                setCoverPreviewFailed(false);
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : "上傳失敗。";
            if (target === "activityBanner") {
                setActivityBannerUploadError(msg);
                setActivityBannerUploadWarning("");
            } else {
                setCoverUploadError(msg);
                setCoverUploadWarning("");
            }
        }
    }, [
        setCoverUrl, setCoverCrop, setCoverPreviewFailed, setCoverUploadError, setCoverUploadWarning,
        setActivityBannerUrl, setActivityBannerPreviewFailed, setActivityBannerUploadError, setActivityBannerUploadWarning,
    ]);

    const handleCoverUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCropSource({ file, name: file.name });
        setCropTarget("cover");
        setCropPurpose("cover");
        setCropOpen(true);
        event.target.value = "";
    }, [setCropSource, setCropTarget, setCropPurpose, setCropOpen]);

    const handleActivityBannerUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setCropSource({ file, name: file.name });
        setCropTarget("activityBanner");
        setCropPurpose("banner");
        setCropOpen(true);
        event.target.value = "";
    }, [setCropSource, setCropTarget, setCropPurpose, setCropOpen]);

    const openCoverMediaPicker = useCallback(() => {
        setMediaPickerTarget("cover");
        setIsMediaPickerOpen(true);
    }, [setMediaPickerTarget, setIsMediaPickerOpen]);

    // Non-destructive focal-point adjust for already-uploaded cover URL
    const openCoverCropFromUrl = useCallback(() => {
        if (!coverUrl) return;
        setCropSource({ url: coverUrl, name: "cover", initialCropRef: coverCrop ?? null });
        setCropTarget("cover");
        setCropPurpose("cover");
        setCropOpen(true);
    }, [coverUrl, coverCrop, setCropSource, setCropTarget, setCropPurpose, setCropOpen]);

    const applyCoverCropRef = useCallback((crop: { cx?: number; cy?: number; zoom?: number }) => {
        setCoverCrop(crop);
    }, [setCoverCrop]);

    const openActivityBannerMediaPicker = useCallback(() => {
        setMediaPickerTarget("activityBanner");
        setIsMediaPickerOpen(true);
    }, [setMediaPickerTarget, setIsMediaPickerOpen]);

    const handleMediaPickerSelect = useCallback((url: string) => {
        if (mediaPickerTarget === "activityBanner") {
            setActivityBannerUrl(url);
            setActivityBannerPreviewFailed(false);
            setActivityBannerUploadError("");
            setActivityBannerUploadWarning("");
        } else {
            setCoverUrl(url);
            setCoverCrop(null);
            setCoverPreviewFailed(false);
            setCoverUploadError("");
            setCoverUploadWarning("");
        }
    }, [
        mediaPickerTarget,
        setCoverUrl, setCoverCrop, setCoverPreviewFailed, setCoverUploadError, setCoverUploadWarning,
        setActivityBannerUrl, setActivityBannerPreviewFailed, setActivityBannerUploadError, setActivityBannerUploadWarning,
    ]);

    const handleMediaPickerSelectMedia = useCallback((selection: MediaSelection) => {
        if (mediaPickerTarget === "activityBanner") {
            setActivityBannerUrl(selection.url);
            setActivityBannerPreviewFailed(false);
            setActivityBannerUploadError("");
            setActivityBannerUploadWarning("");
        } else {
            setCoverUrl(selection.url);
            setCoverCrop(selection.crop || null);
            setCoverPreviewFailed(false);
            setCoverUploadError("");
            setCoverUploadWarning("");
        }
    }, [
        mediaPickerTarget,
        setCoverUrl, setCoverCrop, setCoverPreviewFailed, setCoverUploadError, setCoverUploadWarning,
        setActivityBannerUrl, setActivityBannerPreviewFailed, setActivityBannerUploadError, setActivityBannerUploadWarning,
    ]);

    return {
        applyCroppedUpload,
        handleCoverUpload,
        handleActivityBannerUpload,
        openCoverMediaPicker,
        openActivityBannerMediaPicker,
        openCoverCropFromUrl,
        applyCoverCropRef,
        handleMediaPickerSelect,
        handleMediaPickerSelectMedia,
    };
}
