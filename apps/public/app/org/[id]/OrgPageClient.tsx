"use client";

import { PublicActionArrow, PublicContentLink, PublicPersonLink, PublicTag } from "@/components/PublicDirectoryDetails";
import { useState } from "react";
import type { ExternalPublicScript, PublicAudioWork, PublicOrg, PublicScript } from "@/lib/types";
import { buildOrgEntityModel } from "@/lib/publicEntityPageModel";
import { EntityScriptGrid } from "@/components/EntityScriptGrid";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { PublicOrgMasthead } from "@/components/PublicOrgMasthead";
import { Globe2 } from "lucide-react";
import { ExternalPublicScriptCard } from "@/components/ExternalPublicScriptSection";
import { GalleryHoverPreviewProvider } from "@write/public-ui";

interface OrgWithCrop extends PublicOrg {
  bannerCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  logoCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
}

interface Props {
  org: OrgWithCrop;
  scripts: PublicScript[];
  externalScripts?: ExternalPublicScript[];
  audioWorks?: PublicAudioWork[];
}

type Tab = "scripts" | "audio" | "members";

export function OrgPageClient({ org, scripts, externalScripts = [], audioWorks = [] }: Props) {
  const model = buildOrgEntityModel(org, scripts);
  const scriptCount = scripts.length + externalScripts.length;
  const [activeTab, setActiveTab] = useState<Tab>(scriptCount > 0 || audioWorks.length === 0 ? "scripts" : "audio");
  const members = org.members ?? [];
  const visibleTab = activeTab === "scripts" && scriptCount === 0 && audioWorks.length > 0 ? "audio" : activeTab;
  const tabs: Array<{ id: Tab; label: string }> = [
    ...(scriptCount > 0 || audioWorks.length === 0 ? [{ id: "scripts" as const, label: `台本作品 (${scriptCount})` }] : []),
    ...(audioWorks.length > 0 ? [{ id: "audio" as const, label: `音聲作品 (${audioWorks.length})` }] : []),
    ...(members.length > 0 ? [{ id: "members" as const, label: `成員 (${members.length})` }] : []),
  ];

  return (
    <PublicBrowseMain className="pb-20">
      <PublicOrgMasthead org={org}>
        {model.profileTags.length > 0 && <div className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="組織標籤">
          {model.profileTags.map((tag, index) => <PublicTag key={`${tag}-${index}`}>{tag}</PublicTag>)}
        </div>}
        {org.website && (
          <PublicContentLink href={org.website} target="_blank" rel="noreferrer" appearance="source" className="text-xs sm:text-sm" arrow>
            <Globe2 className="h-3.5 w-3.5" aria-hidden />官方網站
          </PublicContentLink>
        )}
      </PublicOrgMasthead>

      {tabs.length > 1 && <nav aria-label="社團內容" className="mb-5 flex flex-wrap gap-x-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={visibleTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="min-h-10 border-b-2 border-transparent px-2 text-sm text-muted-foreground hover:text-foreground aria-pressed:border-link aria-pressed:font-semibold aria-pressed:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-3"
          >
            {tab.label}
          </button>
        ))}
      </nav>}

      {/* Works */}
      {visibleTab === "scripts" && (
        <section>
          {tabs.length === 1 && <div className="section-bar mb-4"><h2 className="text-[17px] font-bold">台本作品</h2></div>}
          {scriptCount === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              目前沒有公開作品
            </p>
          ) : (
            <>
              {scripts.length > 0 && <EntityScriptGrid scripts={scripts} />}
              {externalScripts.length > 0 && (
                <GalleryHoverPreviewProvider>
                  <div className={`grid gap-4 ${scripts.length > 0 ? "mt-6" : ""}`} style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                    {externalScripts.map((script) => <ExternalPublicScriptCard key={script.id} item={script} organizationHref={`/org/${encodeURIComponent(org.id)}`} />)}
                  </div>
                </GalleryHoverPreviewProvider>
              )}
            </>
          )}
        </section>
      )}

      {visibleTab === "audio" && (
        <section>
          <div className="section-bar"><h2 className="text-[17px] font-bold">音聲作品</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">此社團收錄 {audioWorks.length} 件音聲作品，可查看作品介紹、聲演及發售資訊。</p>
          <a href={`/audio-works?organization=${encodeURIComponent(org.id)}`} className="public-directory-action mt-4 text-sm">查看音聲作品<PublicActionArrow /></a>
        </section>
      )}

      {/* Members */}
      {visibleTab === "members" && (
        <section>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              目前沒有成員資料
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
              {members.map((member) => (
                <li key={member.id} className="min-w-0 border-b border-border py-1">
                  <PublicPersonLink href={member.externalHref || `/author/${encodeURIComponent(member.id)}`} name={member.displayName} avatar={member.avatar} className="text-sm" />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </PublicBrowseMain>
  );
}
