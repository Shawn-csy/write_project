/**
 * Shared types for useScriptMetadata* hooks.
 * All hooks receive a subset of these options via destructuring.
 */
import type { TagLike } from "../../types/persona";
import type { BaseScriptApi } from "../../types/api";

export type { TagLike };

export type ScriptLike = BaseScriptApi & { [key: string]: unknown };

export interface ContactField { id?: string; key: string; value: string }

export interface CustomField { id?: string; key: string; value: string; type?: string }

export interface SeriesOption { id: string; name: string; [key: string]: unknown }

export interface PublishChecklistItem { key: string; label: string; [key: string]: unknown }

export interface PublishChecklist {
  missingRequired: PublishChecklistItem[];
  [key: string]: unknown;
}

export type LicenseSpecialTerm = string;

/** Common state setters shared across metadata hooks */
export interface ScriptMetadataSetters {
  setTitle?: (v: string) => void;
  setCoverUrl?: (v: string) => void;
  setCoverCrop?: (v: { cx?: number; cy?: number; zoom?: number } | null) => void;
  setStatus?: (v: string) => void;
  setCurrentTags?: (v: TagLike[]) => void;
  setMarkerThemeId?: (v: string) => void;
  setShowMarkerLegend?: (v: boolean) => void;
  setDisableCopy?: (v: boolean) => void;
  setTargetAudience?: (v: string) => void;
  setContentRating?: (v: string) => void;
  setIdentity?: (v: string) => void;
  setSelectedOrgId?: (v: string | null) => void;
  setAuthor?: (v: string) => void;
  setAuthorDisplayMode?: (v: string) => void;
  setDate?: (v: string) => void;
  setContact?: (v: string) => void;
  setSynopsis?: (v: string) => void;
  setOutline?: (v: string) => void;
  setRoleSetting?: (v: string) => void;
  setBackgroundInfo?: (v: string) => void;
  setPerformanceInstruction?: (v: string) => void;
  setOpeningIntro?: (v: string) => void;
  setChapterSettings?: (v: string) => void;
  setActivityName?: (v: string) => void;
  setActivityBannerUrl?: (v: string) => void;
  setActivityContent?: (v: string) => void;
  setActivityDemoLinks?: (v: unknown[]) => void;
  setActivityWorkUrl?: (v: string) => void;
  setSeriesName?: (v: string) => void;
  setSeriesId?: (v: string | null) => void;
  setSeriesOrder?: (v: string | number) => void;
  setLicenseCommercial?: (v: string) => void;
  setLicenseDerivative?: (v: string) => void;
  setLicenseNotify?: (v: string) => void;
  setLicenseSpecialTerms?: (v: LicenseSpecialTerm[]) => void;
  setCopyright?: (v: string) => void;
  setCustomFields?: (v: CustomField[]) => void;
  setContactFields?: (v: ContactField[]) => void;
  setIsInitializing?: (v: boolean) => void;
  setActiveTab?: (v: string) => void;
  setShowValidationHints?: (v: boolean) => void;
  setShowPersonaSetupDialog?: (v: boolean) => void;
}
