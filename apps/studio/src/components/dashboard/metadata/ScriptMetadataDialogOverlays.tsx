import { MediaPicker } from "../../ui/MediaPicker";
import { ImageCropDialog } from "../../ui/ImageCropDialog";
import { PersonaSetupDialog } from "./PersonaSetupDialog";
import { useUIContext, useOverlayContext } from "./ScriptMetadataDialogContext";

export function ScriptMetadataDialogOverlays() {
    const { t } = useUIContext();
    const {
        isMediaPickerOpen, setIsMediaPickerOpen,
        mediaPickerTarget,
        handleMediaPickerSelect,
        handleMediaPickerSelectMedia,
        cropOpen, setCropOpen,
        cropSource, cropPurpose, cropTarget,
        applyCroppedUpload,
        applyCoverCropRef,
        showPersonaSetupDialog,
        handlePersonaSetupDialogOpenChange,
        handleGoToAuthorProfile,
    } = useOverlayContext();

    return (
        <>
            <MediaPicker
                open={isMediaPickerOpen}
                onOpenChange={setIsMediaPickerOpen}
                cropPurpose={mediaPickerTarget === "activityBanner" ? "banner" : "cover"}
                onSelect={handleMediaPickerSelect}
                onSelectMedia={handleMediaPickerSelectMedia}
            />
            <ImageCropDialog
                open={cropOpen}
                onOpenChange={setCropOpen}
                source={cropSource}
                purpose={cropPurpose}
                onConfirm={async (croppedFile) => {
                    await applyCroppedUpload(croppedFile, cropTarget);
                }}
                onApplyCropRef={cropSource?.url && cropTarget === "cover" ? applyCoverCropRef : undefined}
                applyCropRefLabel={t("mediaLibrary.applyCropFrame", "套用裁切框")}
                initialCropRef={cropSource?.url ? (cropSource.initialCropRef ?? null) : null}
            />
            <PersonaSetupDialog
                t={t}
                open={showPersonaSetupDialog}
                onOpenChange={handlePersonaSetupDialogOpenChange}
                onGoProfile={handleGoToAuthorProfile}
            />
        </>
    );
}
