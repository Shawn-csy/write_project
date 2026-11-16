"use client";

import { useState } from "react";
import type { ExternalPublicScript, PublicAudioWork, PublicOrg, PublicScript } from "@/lib/types";
import { buildOrgEntityModel } from "@/lib/publicEntityPageModel";
import { EntityScriptGrid } from "@/components/EntityScriptGrid";
import { PublicImage } from "@/components/PublicImage";
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
    <main className="min-h-screen bg-background">
      {/* Banner */}
      {org.bannerUrl && (
        <div className="relative h-48 overflow-hidden bg-muted">
          <PublicImage src={org.bannerUrl} alt="" preset="org-banner" crop={org.bannerCrop} />

        </div>
      )}

      <div className="w-full px-3 sm:px-5 lg:px-8 pb-20">
        {/* Org header card */}
        <div className={`mb-8 border-b border-border pb-6 pt-6`}>
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo */}
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg border-4 border-background bg-muted overflow-hidden shrink-0 shadow">
              {org.logoUrl ? (
                <PublicImage src={org.logoUrl} alt={org.name} preset="logo" crop={org.logoCrop} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  {org.name?.[0]}
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 pt-2">
              <h1 className="text-2xl font-bold">{org.name}</h1>

              {org.description && (
                <p className="text-foreground/85 leading-relaxed max-w-2xl">
                  {org.description}
                </p>
              )}

              {model.profileTags.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">組織標籤</p>
                  <div className="flex flex-wrap gap-2">
                    {model.profileTags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {org.website && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link hover:underline"
                  >
                    🔗 官方網站
                  </a>
                )}
                {members.length > 0 && <span>{members.length} 位成員</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        {tabs.length > 1 && <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 mb-5 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
 visibleTab === tab.id
 ? "bg-background text-foreground font-medium border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>}

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
            <a href={`/audio-works?organization=${encodeURIComponent(org.id)}`} className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">查看音聲作品</a>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {members.map((member) => (
                  <a
                    key={member.id}
                    href={`/author/${member.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-4"
                  >
                    <div className="relative w-10 h-10 rounded-md border border-border bg-muted overflow-hidden shrink-0">
                      {member.avatar ? (
                        <PublicImage src={member.avatar} alt={member.displayName} preset="avatar" sizes="40px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                          {member.displayName?.[0]}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium">{member.displayName}</span>
                  </a>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
