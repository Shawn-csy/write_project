"use client";

import { useState } from "react";
import type { PublicOrg, PublicScript } from "@/lib/types";
import { ScriptCard } from "@/components/ScriptCard";
import { PublicImage } from "@/components/PublicImage";

interface OrgWithCrop extends PublicOrg {
  bannerCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  logoCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
}

interface Props {
  org: OrgWithCrop;
  scripts: PublicScript[];
}

type Tab = "works" | "members";

export function OrgPageClient({ org, scripts }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("works");
  const members = org.members ?? [];

  return (
    <main className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-r from-blue-900 to-slate-900">
        {org.bannerUrl && (
          <PublicImage src={org.bannerUrl} alt="" preset="org-banner" crop={org.bannerCrop} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="w-full px-3 sm:px-5 lg:px-8 pb-20">
        {/* Org header card */}
        <div className="relative -mt-16 mb-8 rounded-xl border border-border/60 bg-background p-6 shadow-sm md:p-8">
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
              <h1 className="text-3xl font-bold font-serif">{org.name}</h1>

              {org.description && (
                <p className="text-foreground/85 leading-relaxed max-w-2xl">
                  {org.description}
                </p>
              )}

              {org.tags && org.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {org.tags.map((tag, i) => (
                    <a
                      key={i}
                      href={`/tag/${encodeURIComponent(tag)}`}
                      className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                    >
                      {tag}
                    </a>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {org.website && (
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    🔗 官方網站
                  </a>
                )}
                <span>{members.length} 位成員</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/30 p-1 mb-5 w-fit">
          {(["works", "members"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-background text-foreground font-medium shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "works" ? `公開作品 (${scripts.length})` : `成員 (${members.length})`}
            </button>
          ))}
        </div>

        {/* Works */}
        {activeTab === "works" && (
          <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
            {scripts.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                目前沒有公開作品
              </p>
            ) : (
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
              >
                {scripts.map((script) => (
                  <ScriptCard key={script.id} script={script} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Members */}
        {activeTab === "members" && (
          <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
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
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="relative w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0">
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
