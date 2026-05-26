import { useMemo } from "react";
import type { TagLike, ContactField, CustomField, SeriesOption } from "./types";
import type { SensorDescriptor } from "@dnd-kit/core";

interface UseScriptMetadataDetailsPropsOptions {
  status: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
  setCoverUrl: (v: string) => void;
  setCoverCrop: (v: { cx?: number; cy?: number; zoom?: number } | null) => void;
  currentTags: TagLike[];
  author: string;
  setAuthor: (v: string) => void;
  availableTags: TagLike[];
  newTagInput: string;
  setNewTagInput: (v: string) => void;
  targetAudience: string;
  handleSetTargetAudience: (v: string) => void;
  contentRating: string;
  handleSetContentRating: (v: string) => void;
  seriesName: string;
  setSeriesName: (v: string) => void;
  seriesId: string | null;
  setSeriesId: (v: string | null) => void;
  seriesOptions: SeriesOption[];
  quickSeriesName: string;
  setQuickSeriesName: (v: string) => void;
  handleQuickCreateSeries: () => void;
  isCreatingSeries: boolean;
  seriesOrder: string | number;
  setSeriesOrder: (v: string | number) => void;
  requiredErrorMap: Record<string, boolean | string>;
  handleAddTag: (tagName?: string) => void;
  handleAddTagsBatch: (tags: string[]) => void;
  handleRemoveTag: (id: string | number) => void;
  handleClearTags: () => void;
  contactFields: ContactField[];
  setContactFields: (v: ContactField[]) => void;
  handleAddContactField: () => void;
  handleContactFieldUpdate: (id: string, key: string, value: string) => void;
  sensors: SensorDescriptor<object>[] | undefined;
  dragDisabled: boolean;
  setDragDisabled: (v: boolean) => void;
  customFields: CustomField[];
  setCustomFields: (v: CustomField[]) => void;
  addCustomField: () => void;
  addDivider: () => void;
  handleCustomFieldUpdate: (id: string, key: string, value: string) => void;
  recommendedErrorMap: Record<string, boolean | string>;
}

export function useScriptMetadataDetailsProps({
  status,
  coverUrl,
  coverCrop,
  setCoverUrl,
  setCoverCrop,
  currentTags,
  author,
  setAuthor,
  availableTags,
  newTagInput,
  setNewTagInput,
  targetAudience,
  handleSetTargetAudience,
  contentRating,
  handleSetContentRating,
  seriesName,
  setSeriesName,
  seriesId,
  setSeriesId,
  seriesOptions,
  quickSeriesName,
  setQuickSeriesName,
  handleQuickCreateSeries,
  isCreatingSeries,
  seriesOrder,
  setSeriesOrder,
  requiredErrorMap,
  handleAddTag,
  handleAddTagsBatch,
  handleRemoveTag,
  handleClearTags,
  contactFields,
  setContactFields,
  handleAddContactField,
  handleContactFieldUpdate,
  sensors,
  dragDisabled,
  setDragDisabled,
  customFields,
  setCustomFields,
  addCustomField,
  addDivider,
  handleCustomFieldUpdate,
  recommendedErrorMap,
}: UseScriptMetadataDetailsPropsOptions) {
  return useMemo(() => ({
    status,
    coverUrl,
    coverCrop,
    setCoverUrl,
    setCoverCrop,
    currentTags,
    author,
    setAuthor,
    availableTags,
    newTagInput,
    setNewTagInput,
    targetAudience,
    setTargetAudience: handleSetTargetAudience,
    contentRating,
    setContentRating: handleSetContentRating,
    seriesName,
    setSeriesName,
    seriesId,
    setSeriesId,
    seriesOptions,
    quickSeriesName,
    setQuickSeriesName,
    onQuickCreateSeries: handleQuickCreateSeries,
    isCreatingSeries,
    seriesOrder,
    setSeriesOrder,
    requiredErrors: requiredErrorMap,
    handleAddTag,
    handleAddTagsBatch,
    handleRemoveTag,
    handleClearTags,
    contactFields,
    setContactFields,
    onAddContactField: handleAddContactField,
    handleContactFieldUpdate,
    activeSensors: sensors,
    dragDisabled,
    setDragDisabled,
    customFields,
    setCustomFields,
    addCustomField,
    addDivider,
    handleCustomFieldUpdate,
    recommendedErrors: recommendedErrorMap,
    showStatusAlert: false,
    showAuthorCover: false,
    showAudienceRating: false,
    showSeries: false,
    showTags: false,
    layout: "stack" as const,
  }), [
    status, coverUrl, coverCrop, setCoverUrl, setCoverCrop, currentTags, author, setAuthor,
    availableTags, newTagInput, setNewTagInput, targetAudience, handleSetTargetAudience,
    contentRating, handleSetContentRating, seriesName, setSeriesName, seriesId, setSeriesId,
    seriesOptions, quickSeriesName, setQuickSeriesName, handleQuickCreateSeries,
    isCreatingSeries, seriesOrder, setSeriesOrder, requiredErrorMap,
    handleAddTag, handleAddTagsBatch, handleRemoveTag, handleClearTags,
    contactFields, setContactFields, handleAddContactField, handleContactFieldUpdate,
    sensors, dragDisabled, setDragDisabled, customFields, setCustomFields,
    addCustomField, addDivider, handleCustomFieldUpdate, recommendedErrorMap,
  ]);
}
