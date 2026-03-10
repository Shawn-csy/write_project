import React from "react";
import { MetadataBasicTab } from "./MetadataBasicTab";

export function ScriptMetadataBasicSection({
  t,
  title,
  setTitle,
  identity,
  setIdentity,
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
}) {
  return (
    <section id="metadata-section-basic" className="space-y-3 scroll-mt-24">
      <h3 className="text-base font-semibold">{t("scriptMetadataDialog.tabBasic", "基本資料")}</h3>
      <MetadataBasicTab
        title={title}
        setTitle={setTitle}
        identity={identity}
        setIdentity={setIdentity}
        currentUser={currentUser}
        personas={personas}
        orgs={orgs}
        selectedOrgId={selectedOrgId}
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
