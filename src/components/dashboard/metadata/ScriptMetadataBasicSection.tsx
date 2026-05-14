import React from "react";
import { MetadataBasicTab } from "./MetadataBasicTab";
import type { PersonaLike, OrgData } from "../../../types/persona";

interface ScriptMetadataBasicSectionProps {
  sectionId?: string;
  showTitle?: boolean;
  t: (key: string, fallback?: string) => string;
  title: string;
  setTitle: (value: string) => void;
  identity: string;
  setIdentity: (value: string) => void;
  identityDisplayName?: string;
  currentUser?: { uid?: string } | null;
  personas: PersonaLike[];
  orgs: OrgData[];
  selectedOrgId: string | null;
  setSelectedOrgId: (value: string | null) => void;
  status: string;
  setStatus: (value: string) => void;
  date: string;
  setDate: (value: string) => void;
  synopsis: string;
  setSynopsis: (value: string) => void;
  outline?: string;
  setOutline: (value: string) => void;
  roleSetting?: string;
  setRoleSetting?: (value: string) => void;
  backgroundInfo?: string;
  setBackgroundInfo: (value: string) => void;
  performanceInstruction?: string;
  setPerformanceInstruction?: (value: string) => void;
  openingIntro?: string;
  setOpeningIntro: (value: string) => void;
  chapterSettings?: string;
  setChapterSettings?: (value: string) => void;
  requiredErrorMap?: Record<string, string | boolean | undefined>;
  recommendedErrorMap?: Record<string, string | boolean | undefined>;
  missingRequiredMap?: Record<string, boolean | undefined>;
}

export function ScriptMetadataBasicSection({
  sectionId = "metadata-section-basic",
  showTitle = true,
  t,
  title,
  setTitle,
  identity,
  setIdentity,
  identityDisplayName,
  currentUser,
  personas,
  orgs,
  selectedOrgId,
  setSelectedOrgId,
  status,
  setStatus,
  date,
  setDate,
  synopsis,
  setSynopsis,
  outline,
  setOutline,
  roleSetting,
  setRoleSetting,
  backgroundInfo,
  setBackgroundInfo,
  performanceInstruction,
  setPerformanceInstruction,
  openingIntro,
  setOpeningIntro,
  chapterSettings,
  setChapterSettings,
  requiredErrorMap,
  recommendedErrorMap,
  missingRequiredMap,
}: ScriptMetadataBasicSectionProps) {
  return (
    <section id={sectionId || undefined} className="space-y-3 scroll-mt-24">
      {showTitle && <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabBasic", "基本資料")}</h3>}
      <MetadataBasicTab
        title={title}
        setTitle={setTitle}
        identity={identity}
        setIdentity={setIdentity}
        identityDisplayName={identityDisplayName}
        currentUser={currentUser}
        personas={personas}
        orgs={(orgs || []).map((org) => ({ id: org.id, name: String(org.name || "") }))}
        selectedOrgId={selectedOrgId || ""}
        setSelectedOrgId={setSelectedOrgId}
        status={status}
        setStatus={setStatus}
        date={date}
        setDate={setDate}
        synopsis={synopsis}
        setSynopsis={setSynopsis}
        outline={outline}
        setOutline={setOutline}
        roleSetting={roleSetting}
        setRoleSetting={setRoleSetting}
        backgroundInfo={backgroundInfo}
        setBackgroundInfo={setBackgroundInfo}
        performanceInstruction={performanceInstruction}
        setPerformanceInstruction={setPerformanceInstruction}
        openingIntro={openingIntro}
        setOpeningIntro={setOpeningIntro}
        chapterSettings={chapterSettings}
        setChapterSettings={setChapterSettings}
        requiredErrors={requiredErrorMap}
        recommendedErrors={recommendedErrorMap}
        layout="rows"
        requiredHighlights={missingRequiredMap}
        rowLabelTones={{
          title: "required",
          identity: "required",
          status: "required",
          synopsis: "recommended",
          outline: "advanced",
          roleSetting: "advanced",
          backgroundInfo: "advanced",
          openingIntro: "advanced",
          chapterSettings: "advanced",
        }}
      />
    </section>
  );
}
