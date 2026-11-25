"use client";

import { useProgressiveLimit } from "@/lib/useProgressiveLimit";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PublicSearchField } from "@/components/PublicSearchField";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicAvatarImage } from "@/components/PublicAvatarImage";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { readPublicBundle } from "@/lib/readPublicBundle";
import { buildVoiceActorDirectory, VOICE_ACTOR_DIRECTORY_SECTIONS, type VoiceActorDirectoryBundle, type VoiceActorDirectoryEntry } from "@/lib/voiceActorDirectory";

interface Props {
  initialDirectory: VoiceActorDirectoryEntry[];
  refreshOnMount?: boolean;
}

function socialLinks(persona: VoiceActorDirectoryEntry): Array<{ label: string; url: string }> {
  const links = Array.isArray(persona.links) ? persona.links : [];
  const unique = new Set<string>();
  return links.filter((item) => {
    const url = String(item.url || "").trim();
    if (!/^https:\/\//i.test(url) || unique.has(url)) return false;
    unique.add(url);
    return true;
  }).map((item) => ({ label: String(item.label || "社群"), url: String(item.url) }));
}

export function VoiceActorDirectoryClient({ initialDirectory, refreshOnMount = false }: Props) {
  const [directory, setDirectory] = useState(initialDirectory);
  const [query, setQuery] = useState("");
  const renderLimit = useProgressiveLimit(24);

  useEffect(() => {
    if (!refreshOnMount) return;
    let active = true;
    void readPublicBundle<VoiceActorDirectoryBundle>(VOICE_ACTOR_DIRECTORY_SECTIONS)
      .then(({ data }) => {
        if (active && Array.isArray(data.personas)) setDirectory(buildVoiceActorDirectory(data));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [refreshOnMount]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return directory
      .filter((persona) => !needle || `${persona.displayName} ${persona.bio || ""} ${(persona.tags || []).join(" ")}`.toLocaleLowerCase().includes(needle))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-Hant"));
  }, [directory, query]);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <PublicBrowseMain>
        <PublicBrowseHeader title="聲演" count={`${visible.length} 位`} search={
          <PublicSearchField value={query} onChange={setQuery} placeholder="搜尋聲演" />
        } />

        {visible.length === 0 ? (
          <PublicEmptyState
            className="border-y border-border"
            title={query.trim() ? "找不到符合的聲演。" : "目前還沒有公開聲演身份。"}
            primaryAction={query.trim() ? { label: "清除搜尋", onClick: () => setQuery("") } : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.slice(0, renderLimit).map((persona) => {
              const socials = socialLinks(persona);
              return (
                <article key={persona.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <a href={persona.externalHref || `/author/${encodeURIComponent(persona.id)}`} aria-label={`${persona.displayName}身份頁`} className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-lg font-semibold text-muted-foreground">
                    <PublicAvatarImage src={persona.avatar} name={persona.displayName} sizes="48px" />
                  </a>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <a href={persona.externalHref || `/author/${encodeURIComponent(persona.id)}`} className="truncate font-semibold hover:text-link">{persona.displayName}</a>
                    </div>
                    {persona.bio && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{persona.bio}</p>}
                    {socials.length > 0 && <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{socials.slice(0, 3).map((social) => <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-link hover:underline">{social.label}<ExternalLink className="h-3 w-3" aria-hidden /></a>)}</div>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PublicBrowseMain>
    </div>
  );
}
