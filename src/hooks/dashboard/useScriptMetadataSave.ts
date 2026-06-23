import { useCallback, useRef, useState } from "react";
import { updateScript, addTagToScript, removeTagFromScript } from "../../lib/api/scripts";
import { createTag } from "../../lib/api/tags";
import { fromDraftToPayload } from "../../lib/scriptMetadataAdapter";
import type { ScriptMetadataDraft } from "../../lib/scriptMetadataAdapter";
import { AUDIENCE_TAG_GROUP, RATING_TAG_GROUP, syncGroupedTagSelection } from "./tagGroupUtils";
import type { BaseScriptApi, ScriptUpdatePayload } from "../../types/api";
import type {
  ScriptLike, TagLike, SeriesOption,
  PublishChecklist, LicenseSpecialTerm,
} from "./types";

interface UseScriptMetadataSaveOptions {
  t: (key: string, fallback?: string) => string;
  toast: (opts: { title?: string; description?: string; variant?: string }) => void;
  script: ScriptLike | null;
  activeScript?: ScriptLike | null;
  // draft fields
  draft: ScriptMetadataDraft;
  // tag helpers (needed for audience/rating sync, outside draft)
  availableTags: TagLike[];
  setCurrentTags: (tags: TagLike[]) => void;
  seriesOptions?: SeriesOption[];
  // validation helpers
  publishChecklist: PublishChecklist;
  needsPersonaBeforePublish: boolean;
  hasAnyPersona: boolean;
  jumpToChecklistItem: (key: string) => void;
  setShowValidationHints: (v: boolean) => void;
  setShowPersonaSetupDialog: (v: boolean) => void;
  setActiveTab: (v: string) => void;
  // callbacks
  onSave: (script: ScriptLike) => void;
  onOpenChange: (open: boolean) => void;
  saveScript?: (id: string, payload: ScriptUpdatePayload & { author?: string }, extra?: Record<string, unknown>) => Promise<BaseScriptApi>;
  syncScriptTags?: (id: string, tags: TagLike[]) => Promise<void>;
  preserveAuthorInternalData?: boolean;
  authorEditedRef?: { current?: boolean } | null;
}

export function useScriptMetadataSave({
  t,
  toast,
  script,
  activeScript,
  draft,
  availableTags,
  setCurrentTags,
  seriesOptions,
  publishChecklist,
  needsPersonaBeforePublish,
  hasAnyPersona,
  jumpToChecklistItem,
  setShowValidationHints,
  setShowPersonaSetupDialog,
  setActiveTab,
  onSave,
  onOpenChange,
  saveScript,
  syncScriptTags,
  preserveAuthorInternalData = false,
  authorEditedRef = { current: false },
}: UseScriptMetadataSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);

  // Capture latest values via ref so handleSave (stable useCallback(fn, []))
  // always reads current state without re-subscribing.
  const latestRef = useRef<UseScriptMetadataSaveOptions | null>(null);
  latestRef.current = {
    t, toast, script, activeScript, draft, availableTags, setCurrentTags,
    seriesOptions, publishChecklist, needsPersonaBeforePublish, hasAnyPersona,
    jumpToChecklistItem, setShowValidationHints, setShowPersonaSetupDialog,
    setActiveTab, onSave, onOpenChange, saveScript, syncScriptTags,
    preserveAuthorInternalData, authorEditedRef,
  };

  const handleSave = useCallback(async () => {
    const opts = latestRef.current;
    if (!opts) return;
    const {
      t, toast, script, activeScript, draft, availableTags, setCurrentTags,
      seriesOptions, publishChecklist, needsPersonaBeforePublish, hasAnyPersona,
      jumpToChecklistItem, setShowValidationHints, setShowPersonaSetupDialog,
      setActiveTab, onSave, onOpenChange, saveScript, syncScriptTags,
      preserveAuthorInternalData, authorEditedRef,
    } = opts;

    const { status, personaId, currentTags, targetAudience, contentRating } = draft;
    const hasValidPersonaSelection = Boolean(personaId);

    setShowValidationHints(true);

    if (needsPersonaBeforePublish) {
      toast({
        title: t("scriptMetadataDialog.selectIdentityFirst", "請先選擇作者"),
        description: t("scriptMetadataDialog.selectIdentityToPublish", "公開前需要作者身份，可直接在下方快速建立。"),
        variant: "destructive",
      });
      setActiveTab("basic");
      if (!hasAnyPersona) setShowPersonaSetupDialog(true);
      return;
    }
    if (!hasValidPersonaSelection) {
      toast({
        title: !hasAnyPersona
          ? t("scriptMetadataDialog.noPersonaYet", "尚未建立作者身份")
          : t("scriptMetadataDialog.selectIdentityFirst"),
        description: !hasAnyPersona
          ? t("scriptMetadataDialog.noPersonaYetDesc", "先建立一個作者身份，之後即可在這裡選擇並套用到劇本。")
          : undefined,
        variant: "destructive",
      });
      setActiveTab("basic");
      if (!hasAnyPersona) setShowPersonaSetupDialog(true);
      return;
    }
    if (status === "Public" && publishChecklist.missingRequired.length > 0) {
      const firstMissing = publishChecklist.missingRequired[0];
      if (firstMissing?.key) jumpToChecklistItem(firstMissing.key);
      toast({
        title: t("scriptMetadataDialog.cannotPublish"),
        description: t("scriptMetadataDialog.cannotPublishDesc").replace(
          "{items}",
          publishChecklist.missingRequired.map((item) => item.label).join("、")
        ),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // --- Tag sync for audience / rating ---
      let tagsToSave = [...currentTags];
      if (targetAudience) {
        try {
          tagsToSave = await syncGroupedTagSelection({
            currentTags: tagsToSave,
            availableTags,
            selectedName: targetAudience,
            groupNames: AUDIENCE_TAG_GROUP,
            createTag: createTag as (name: string, color: string, ownerIdQuery?: string) => Promise<TagLike>,
            resolveColor: () => "bg-gray-500",
            onTagCreated: () => {},
          });
        } catch (error) {
          console.warn("Failed to sync audience tag, continue saving without blocking", error);
        }
      }
      if (contentRating) {
        try {
          tagsToSave = await syncGroupedTagSelection({
            currentTags: tagsToSave,
            availableTags,
            selectedName: contentRating,
            groupNames: RATING_TAG_GROUP,
            createTag: createTag as (name: string, color: string, ownerIdQuery?: string) => Promise<TagLike>,
            resolveColor: (name) => (name === "成人向" ? "bg-red-500" : "bg-gray-500"),
            onTagCreated: () => {},
          });
        } catch (error) {
          console.warn("Failed to sync content rating tag, continue saving without blocking", error);
        }
      }

      const workingScript = activeScript || script;
      if (!workingScript) return;

      // --- Build payload via adapter ---
      const authorEditedValue = (authorEditedRef as { current?: boolean } | null)?.current ?? false;
      const shouldPreserveAuthor = preserveAuthorInternalData && !authorEditedValue;

      const draftWithTags: ScriptMetadataDraft = { ...draft, currentTags: tagsToSave };
      const payload = fromDraftToPayload(draftWithTags, {
        preserveAuthor: shouldPreserveAuthor,
      });

      const persisted = saveScript
        ? await saveScript(workingScript.id, payload, {
            script: workingScript,
            tagIds: tagsToSave.map((tag) => Number(tag?.id)).filter((id) => Number.isFinite(id)),
          })
        : await updateScript(workingScript.id, payload);

      // --- Tag delta sync ---
      const originalTagIds = new Set(((workingScript && workingScript.tags) || []).map((tag) => String(tag.id)));
      const finalTagIds = new Set(tagsToSave.map((tag) => String(tag.id)));
      const addedTags = tagsToSave.filter((tag) => !originalTagIds.has(String(tag.id)));
      const removedTags = ((workingScript && workingScript.tags) || []).filter(
        (tag) => !finalTagIds.has(String(tag.id))
      );

      if (typeof syncScriptTags === "function") {
        await syncScriptTags(workingScript.id, tagsToSave);
      } else {
        await Promise.all([
          ...addedTags.map((tag) => addTagToScript(workingScript.id, String(tag.id))),
          ...removedTags.map((tag) => removeTagFromScript(workingScript.id, String(tag.id))),
        ]);
      }

      const effectiveAuthorDisplayMode = draft.authorDisplayMode === "override" ? "override" : "badge";
      const persistedAuthor = effectiveAuthorDisplayMode === "override" ? String(draft.author || "") : "";

      onSave({
        ...(workingScript || script),
        ...(persisted || {}),
        title: draft.title,
        coverUrl: draft.coverUrl,
        coverCrop: draft.coverCrop ?? null,
        coverDesign: draft.coverDesign ?? null,
        status: draft.status,
        customMetadata: payload.customMetadata,
        author: shouldPreserveAuthor ? String(workingScript?.author || "") : persistedAuthor,
        draftDate: draft.draftDate,
        licenseCommercial: draft.licenseCommercial || "",
        licenseDerivative: draft.licenseDerivative || "",
        licenseNotify: draft.licenseNotify || "",
        licenseSpecialTerms: payload.licenseSpecialTerms,
        targetAudience: payload.targetAudience,
        contentRating: payload.contentRating,
        authorDisplayMode: payload.authorDisplayMode ?? String(workingScript?.authorDisplayMode || ""),
        authorOverrideName: payload.authorOverrideName ?? String(workingScript?.authorOverrideName || ""),
        tags: tagsToSave as Array<{ id?: string; name: string }>,
        markerThemeId: draft.markerThemeId,
        seriesId: payload.seriesId,
        seriesOrder: payload.seriesOrder,
      });
      setCurrentTags(tagsToSave);

      if ((targetAudience || contentRating) && tagsToSave.length === currentTags.length) {
        toast({
          title: t("scriptMetadataDialog.saved"),
          description: "內容已儲存；分級/取向標籤同步失敗，請稍後重試或手動補上。",
        });
      } else {
        toast({ title: t("scriptMetadataDialog.saved") });
      }
      setShowValidationHints(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save script metadata", error);
      toast({
        title: t("scriptMetadataDialog.saveFailed"),
        description: t("scriptMetadataDialog.tryLater"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { isSaving, handleSave };
}
