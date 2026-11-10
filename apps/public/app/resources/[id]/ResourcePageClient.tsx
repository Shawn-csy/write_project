"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Headphones } from "lucide-react";
import { PublicAvatarImage } from "@/components/PublicAvatarImage";
import { PublicFooter } from "@/components/PublicFooter";
import { PublicImage } from "@/components/PublicImage";
import { PublicTopBar } from "@/components/PublicTopBar";
import { publicAvatarColor } from "@/components/publicAvatarColor";
import type { ProductionResource } from "../ResourcesClient";

const CATEGORY_LABELS: Record<Exclude<ProductionResource["categories"][number], "voice_actor">, string> = {
  post_production: "後製",
  cover_art: "封面",
  recording_studio: "錄音室",
};

function profileLinks(item: ProductionResource): Array<{ label: string; url: string }> {
  const candidates = [
    ...(item.kind !== "credit" ? [{ label: "官方／委託頁", url: item.sourceUrl || item.websiteUrl }] : []),
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

export function ResourcePageClient({ item }: { item: ProductionResource }) {
  const [ageConfirmed, setAgeConfirmed] = useState(false);
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
    <main className="w-full flex-1 px-3 pb-20 sm:px-5 lg:px-8">
      <div className="mt-6 rounded-xl border border-border/60 bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow sm:h-36 sm:w-36">
            <PublicAvatarImage src={item.avatarUrl} name={item.name} sizes="144px" fallbackClassName={publicAvatarColor(item.name)} />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <h1 className="font-serif text-3xl font-bold">{item.name}</h1>
            <div className="flex flex-wrap gap-2" aria-label="製作身份">
              {categories.map((category) => <a key={category} href={`/resources?category=${category}`} className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20">{CATEGORY_LABELS[category]}</a>)}
            </div>
            {(item.bio || item.summary) && <p className="max-w-3xl whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{item.bio || item.summary}</p>}
            {links.length > 0 && <div className="flex flex-wrap gap-2 pt-1" aria-label="聯絡與官方連結">
              {links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 text-sm font-medium text-primary hover:border-primary/40 hover:bg-primary/5">{link.label}<ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>)}
            </div>}
          </div>
        </div>
      </div>

      <section className="mt-8" aria-label="參與作品">
        <div className="mb-4 flex flex-wrap items-baseline gap-2">
          <h2 className="font-serif text-2xl font-bold">參與作品</h2>
          <span className="text-sm text-muted-foreground">{works.length} 部</span>
        </div>
        {!ageConfirmed && <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">參與作品可能包含成人向封面與內容。</p>
          <button type="button" onClick={() => setAgeConfirmed(true)} className="min-h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">我已年滿 18 歲，顯示作品</button>
        </div>}
        {ageConfirmed && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {works.map((work) => <a key={`${work.id}-${work.creditRole}`} href={work.url} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-xl border border-border/60 bg-card transition-colors hover:border-primary/40" aria-label={`前往作品：${work.title}`}>
            <div className="relative aspect-[4/3] overflow-hidden bg-muted">
              {work.coverUrl ? <PublicImage src={work.coverUrl} alt={`${work.title}封面`} preset="script-cover" sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" /> : <Headphones className="absolute inset-0 m-auto h-9 w-9 text-muted-foreground/60" aria-hidden />}
            </div>
            <div className="p-3">
              <h3 className="line-clamp-2 text-sm font-semibold group-hover:text-primary">{work.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{CATEGORY_LABELS[work.creditRole as keyof typeof CATEGORY_LABELS] || "製作"}{work.creditedAs && work.creditedAs !== item.name ? `・${work.creditedAs}` : ""}</p>
            </div>
          </a>)}
        </div>}
      </section>
    </main>
    <PublicFooter />
  </div>;
}
