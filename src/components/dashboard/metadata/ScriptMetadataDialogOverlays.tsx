import { MediaPicker } from "../../ui/MediaPicker";
import { ImageCropDialog } from "../../ui/ImageCropDialog";
import { SpotlightGuideOverlay } from "../../common/SpotlightGuideOverlay";
import { PersonaSetupDialog } from "./PersonaSetupDialog";
import { useUIContext, useChecklistContext, useOverlayContext } from "./ScriptMetadataDialogContext";

export function ScriptMetadataDialogOverlays() {
    const { t, showGuide } = useUIContext();
    const { currentGuide, guideSpotlightRect, guideIndex, guideSteps, finishGuide, handleGuidePrev, handleGuideNext } = useChecklistContext();
    const {
        isMediaPickerOpen, setIsMediaPickerOpen,
        mediaPickerTarget,
        handleMediaPickerSelect,
        handleMediaPickerSelectMedia,
        cropOpen, setCropOpen,
        cropSource, cropPurpose, cropTarget,
        applyCroppedUpload,
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
            />
            <SpotlightGuideOverlay
                open={showGuide && Boolean(currentGuide)}
                zIndex={240}
                spotlightRect={guideSpotlightRect}
                currentStep={guideIndex + 1}
                totalSteps={guideSteps.length}
                title={currentGuide?.title}
                description={currentGuide?.description}
                onSkip={finishGuide}
                skipLabel={t("scriptMetadataDialog.guideSkip")}
                onPrev={handleGuidePrev}
                prevLabel={t("scriptMetadataDialog.guidePrev")}
                prevDisabled={guideIndex === 0}
                onNext={handleGuideNext}
                nextLabel={
                    guideIndex === guideSteps.length - 1
                        ? t("scriptMetadataDialog.guideDone")
                        : t("scriptMetadataDialog.guideNext")
                }
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
