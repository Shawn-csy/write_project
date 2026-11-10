"use client";

import { useEffect, useState } from "react";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicTopBar } from "@/components/PublicTopBar";
import { ResourceAgeGate, useResourceAgeGate } from "@/components/ResourceAgeGate";
import { PublicProfileAvatar, PublicProfileCard, PublicProfileContainer, PublicProfileLink, PublicProfileRole, PublicProfileSection, PublicProfileWorkCard } from "@/components/PublicProfileLayout";
import { readPublicBundle } from "@/lib/readPublicBundle";
import type { ProductionResource } from "../ResourcesClient";
import { ResourceContributionForm } from "./ResourceContributionForm";

const CATEGORY_LABELS: Record<Exclude<ProductionResource["categories"][number], "voice_actor">, string> = {
  post_production: "後製",
  cover_art: "封面",
  recording_studio: "錄音室",
};

function profileLinks(item: ProductionResource): Array<{ label: string; url: string }> {
  const primaryUrl = item.sourceUrl || item.websiteUrl;
  const primaryLabel = !item.profileUrl && item.links?.find((link) => link.url === primaryUrl)?.label || "官方／委託頁";
  const candidates = [
    ...(item.kind !== "credit" ? [{ label: primaryLabel, url: primaryUrl }] : []),
    ...(item.profileUrl ? [{ label: item.profileLabel || "創作者連結", url: item.profileUrl }] : []),
    ...(item.links || []),
  ];
  const seen = new Set<string>();
  return candidates.filter((link) => {
    try {
      const url = new URL(link.url);
      if (!["https:", "http:"].includes(url.protocol) || seen.has(url.href)) return false;
      seen.add(url.href);
      return true;
    } catch {
      return false;
    }
  });
}

export function ResourcePageClient({ item: initialItem, refreshOnMount = false }: { item: ProductionResource; refreshOnMount?: boolean }) {
  const [item, setItem] = useState(initialItem);
  const [formOpen, setFormOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  useEffect(() => {
    if (!refreshOnMount) return;
    let active = true;
    void readPublicBundle<{ productionResources?: ProductionResource[] }>(["productionResources"])
      .then(({ data }) => {
        const updated = data.productionResources?.find((resource) => resource.id === initialItem.id);
        if (active && updated) setItem(updated);
      }).catch(() => {});
    return () => { active = false; };
  }, [initialItem.id, refreshOnMount]);
  const { confirmed: ageConfirmed, ready: ageGateReady, confirm: confirmAge } = useResourceAgeGate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("category");
    if (requested && item.categories.includes(requested as ProductionResource["categories"][number])) setSelectedCategory(requested);
  }, [item.categories]);
  const links = profileLinks(item);
  const categories = item.categories.filter((category): category is keyof typeof CATEGORY_LABELS => category in CATEGORY_LABELS);
  const works = item.works || [];
  const backCategory = selectedCategory || categories[0];
  const backHref = backCategory ? `/resources?category=${backCategory}` : "/resources";

  return <div className="flex min-h-screen flex-col bg-background">
    <PublicTopBar activeTab="resources" showBack backHref={backHref} backLabel="返回資源名錄" />
    <main className="w-full flex-1">
      <PublicProfileContainer>
      {ageGateReady && !ageConfirmed && <div className="mt-6"><ResourceAgeGate onConfirm={confirmAge} /></div>}
      <PublicProfileCard>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <PublicProfileAvatar src={item.avatarUrl} name={item.name} />
          <div className="min-w-0 flex-1 space-y-3">
            <h1 className="font-serif text-3xl font-bold">{item.name}</h1>
            <div className="flex flex-wrap gap-2" aria-label="製作身份">
              {categories.map((category) => <PublicProfileRole key={category} href={`/resources?category=${category}`}>{CATEGORY_LABELS[category]}</PublicProfileRole>)}
            </div>
            {(item.bio || item.summary) && <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{item.bio || item.summary}</p>}
            {links.length > 0 && <div className="flex flex-wrap gap-2 pt-1" aria-label="聯絡與官方連結">
              {links.map((link) => <PublicProfileLink key={link.url} label={link.label} url={link.url} />)}
            </div>}
            {(item.contributors || []).length > 0 && <p className="text-xs text-muted-foreground">資料協力者：{item.contributors!.map((person) => person.name).join("、")}</p>}
            {!formOpen && !formSubmitted && <button type="button" onClick={() => setFormOpen(true)} className="rounded-md border border-primary/40 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10">補充／更新資源資料</button>}
            {formSubmitted && <p role="status" className="text-sm text-emerald-600">資料已送交審核；核准後會更新公開資源頁。謝謝你協助補充資料。</p>}
          </div>
        </div>
        {formOpen && <ResourceContributionForm item={item} onClose={() => setFormOpen(false)} onSubmitted={() => { setFormOpen(false); setFormSubmitted(true); }} />}
      </PublicProfileCard>

      <PublicProfileSection title="參與作品" count={works.length}>
        {ageConfirmed && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((work) => <PublicProfileWorkCard key={`${work.id}-${work.creditRole}`} title={work.title} url={work.url} coverUrl={work.coverUrl} subtitle={`${CATEGORY_LABELS[work.creditRole as keyof typeof CATEGORY_LABELS] || "製作"}${work.creditedAs && work.creditedAs !== item.name ? `・${work.creditedAs}` : ""}`} />)}
        </div>}
      </PublicProfileSection>
      </PublicProfileContainer>
    </main>
    <PublicFooter />
  </div>;
}
