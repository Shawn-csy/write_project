"use client";

import { useState } from "react";
import { partitionContacts, type ContactLike } from "@/lib/publicContactPrivacy";
import { publicIdentityTags } from "@/lib/publicIdentityMetadata";
import { PublicAvatarImage } from "./PublicAvatarImage";
import { publicAvatarColor } from "./publicAvatarColor";
import { PublicWorkLane, type PublicWorkLaneItem } from "./PublicWorkLane";
import { PublicContentLink, PublicMetadataLabel, PublicTag } from "./PublicDirectoryDetails";

function contactHref(value: string): string | undefined {
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) {
    try { const url = new URL(text); return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined; } catch { return undefined; }
  }
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(text)) return text;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return `mailto:${text}`;
  return undefined;
}

export function PublicIdentityDirectoryRow({ name, href, avatar, bio, works, workCount = works.length, roleLabels = [], tags = [], links = [], onTagClick, showWorks = true, extra, emptyLabel = "尚無參與作品" }: {
  name: string; href: string; avatar?: string; bio?: string; works: PublicWorkLaneItem[]; workCount?: number;
  roleLabels?: string[]; tags?: string[]; links?: ContactLike[];
  onTagClick?: (tag: string) => void; showWorks?: boolean; extra?: React.ReactNode; emptyLabel?: string;
}) {
  const [showPrivateContacts, setShowPrivateContacts] = useState(false);
  const [expandedTags, setExpandedTags] = useState(false);
  const { visible, hidden } = partitionContacts(links);
  const contacts = showPrivateContacts ? [...visible, ...hidden] : visible;
  const distinctTags = publicIdentityTags(tags);
  const shownTags = expandedTags ? distinctTags : distinctTags.slice(0, 3);
  return <article className="min-w-0 border-b border-border py-2.5">
    <div className="flex min-w-0 gap-2.5">
      <a href={href} tabIndex={-1} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-12 sm:w-12"><PublicAvatarImage src={avatar} name={name} sizes="48px" fallbackClassName={publicAvatarColor(name)} /></a>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="font-bold [font-size:var(--public-font-body)]"><PublicContentLink href={href} aria-label={`${name}的個人頁`} appearance="title">{name}</PublicContentLink></h2>
          <span className="[font-size:var(--public-font-caption)] text-muted-foreground">{workCount ? `${workCount} 部參與作品` : emptyLabel}</span>
        </div>
        {bio && <p className="mt-0.5 line-clamp-2 [font-size:var(--public-font-caption)] leading-relaxed text-muted-foreground">{bio}</p>}
        {extra}
        {roleLabels.length > 0 && (
          <div role="group" aria-label="角色" className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 [font-size:var(--public-font-caption)]">
            {roleLabels.map((role) => <PublicMetadataLabel key={role}>{role}</PublicMetadataLabel>)}
          </div>
        )}
        {shownTags.length > 0 && (
          <div role="group" aria-label="標籤" className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1 [font-size:var(--public-font-caption)]">
            {shownTags.map((tag, index) => onTagClick
              ? <button key={tag} type="button" onClick={() => onTagClick(tag)} className={`public-facet-tag ${index >= 3 ? "public-tag-enter" : ""}`}><PublicTag>{tag}</PublicTag></button>
              : <span key={tag} className={index >= 3 ? "public-tag-enter" : undefined}><PublicTag>{tag}</PublicTag></span>)}
            {distinctTags.length > 3 && <button type="button" aria-expanded={expandedTags} onClick={() => setExpandedTags(!expandedTags)} className="public-facet-tag">{expandedTags ? "收合" : `更多（${distinctTags.length - 3}）`}</button>}
          </div>
        )}
        {(contacts.length > 0 || (hidden.length > 0 && !showPrivateContacts)) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 [font-size:var(--public-font-caption)]">
            {contacts.map((link, index) => {
              const value = String(link.url ?? link.value ?? "").trim();
              const target = contactHref(value);
              return target ? <PublicContentLink key={`${value}-${index}`} href={target} arrow target={target.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer" aria-label={`${name}的${link.label || "連結"}`}>{link.label || "連結"}</PublicContentLink>
                : <span key={`${value}-${index}`} className="break-all text-muted-foreground">{link.label || "聯絡方式"}：{value}</span>;
            })}
            {hidden.length > 0 && !showPrivateContacts && <button type="button" onClick={() => setShowPrivateContacts(true)} className="public-facet-tag">顯示聯絡方式</button>}
          </div>
        )}
      </div>
    </div>
    {showWorks && <PublicWorkLane works={works} />}
  </article>;
}
