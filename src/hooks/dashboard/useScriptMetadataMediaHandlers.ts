import { useCallback } from "react";
import { uploadMediaObject } from "../../lib/api/media";
import { optimizeImageForUpload } from "../../lib/mediaLibrary";

interface MediaHandlerState {
    setCoverUrl: (url: string) => void;
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
    setCropSource: (v: { file: File; name: string } | null) => void;
    setCropTarget: (v: string) => void;
    setCropPurpose: (v: "avatar" | "logo" | "cover" | "banner" | "generic") => void;
    setCropOpen: (v: boolean) => void;
}

export function useScriptMetadataMediaHandlers({
    setCoverUrl, setCoverPreviewFailed, setCoverUploadError, setCoverUploadWarning,
    setActivityBannerUrl, setActivityBannerPreviewFailed, setActivityBannerUploadError, setActivityBannerUploadWarning,
    setIsMediaPickerOpen, setMediaPickerTarget, mediaPickerTarget,
    setCropSource, setCropTarget, setCropPurpose, setCropOpen,
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
        setCoverUrl, setCoverPreviewFailed, setCoverUploadError, setCoverUploadWarning,
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
            setCoverPreviewFailed(false);
            setCoverUploadError("");
            setCoverUploadWarning("");
        }
    }, [
        mediaPickerTarget,
        setCoverUrl, setCoverPreviewFailed, setCoverUploadError, setCoverUploadWarning,
        setActivityBannerUrl, setActivityBannerPreviewFailed, setActivityBannerUploadError, setActivityBannerUploadWarning,
    ]);

    return {
        applyCroppedUpload,
        handleCoverUpload,
        handleActivityBannerUpload,
        openCoverMediaPicker,
        openActivityBannerMediaPicker,
        handleMediaPickerSelect,
    };
}
