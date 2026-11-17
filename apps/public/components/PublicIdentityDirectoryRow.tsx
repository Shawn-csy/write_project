"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { partitionContacts, type ContactLike } from "@/lib/publicContactPrivacy";
import { PublicAvatarImage } from "./PublicAvatarImage";
import { publicAvatarColor } from "./publicAvatarColor";
import { PublicWorkLane, type PublicWorkLaneItem } from "./PublicWorkLane";

export const DIRECTORY_TAG_CLASS = "[font-size:var(--public-font-caption)] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground";

function contactHref(value: string): string | undefined {
  const text = value.trim();
  if (/^https?:\/\//i.test(text)) {
    try { const url = new URL(text); return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined; } catch { return undefined; }
  }
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(text)) return text;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return `mailto:${text}`;
  return undefined;
}

export function PublicIdentityDirectoryRow({ name, href, avatar, bio, works, roleLabels = [], tags = [], links = [], onTagClick, showWorks = true, extra, emptyLabel = "尚無參與作品" }: {
  name: string; href: string; avatar?: string; bio?: string; works: PublicWorkLaneItem[];
  roleLabels?: string[]; tags?: string[]; links?: ContactLike[];
  onTagClick?: (tag: string) => void; showWorks?: boolean; extra?: React.ReactNode; emptyLabel?: string;
}) {
  const [showPrivateContacts, setShowPrivateContacts] = useState(false);
  const [expandedTags, setExpandedTags] = useState(false);
  const { visible, hidden } = partitionContacts(links);
  const contacts = showPrivateContacts ? [...visible, ...hidden] : visible;
  const distinctTags = tags.filter((tag) => !roleLabels.includes(tag));
  const shownTags = expandedTags ? distinctTags : distinctTags.slice(0, 3);
  return <article className="min-w-0 border-b border-border py-3">
    <div className="flex min-w-0 gap-3">
      <a href={href} tabIndex={-1} className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-12 sm:w-12"><PublicAvatarImage src={avatar} name={name} sizes="48px" fallbackClassName={publicAvatarColor(name)} /></a>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 className="font-bold [font-size:var(--public-font-body)]"><a href={href} aria-label={`${name}的個人頁`} className="hover:text-link hover:underline">{name}</a></h2>
          <span className="[font-size:var(--public-font-caption)] text-muted-foreground">{works.length ? `${works.length} 部參與作品` : emptyLabel}</span>
        </div>
        {bio && <p className="mt-0.5 line-clamp-2 [font-size:var(--public-font-caption)] leading-relaxed text-muted-foreground">{bio}</p>}
        {extra}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {roleLabels.length > 0 && <div className="flex flex-wrap gap-1.5">{roleLabels.map((role) => <span key={role} className={DIRECTORY_TAG_CLASS}>{role}</span>)}</div>}
          {distinctTags.length > 0 && <div className="flex flex-wrap gap-1.5">{shownTags.map((tag) => onTagClick
            ? <button key={tag} type="button" onClick={() => onTagClick(tag)} className={`${DIRECTORY_TAG_CLASS} tap-grow hover:text-link hover:underline`}>{tag}</button>
            : <span key={tag} className={DIRECTORY_TAG_CLASS}>{tag}</span>)}
            {distinctTags.length > 3 && <button type="button" onClick={() => setExpandedTags(!expandedTags)} className="[font-size:var(--public-font-caption)] text-link hover:underline">{expandedTags ? "收合" : `更多（${distinctTags.length - 3}）`}</button>}</div>}
          {contacts.map((link, index) => {
            const value = String(link.url ?? link.value ?? "").trim();
            const target = contactHref(value);
            return target ? <a key={`${value}-${index}`} href={target} target={target.startsWith("mailto:") ? undefined : "_blank"} rel="noopener noreferrer" className="tap-grow inline-flex items-center gap-0.5 [font-size:var(--public-font-caption)] text-link hover:underline" aria-label={`${name}的${link.label || "連結"}`}>{link.label || "連結"}<ArrowUpRight className="h-3 w-3" aria-hidden /></a>
              : <span key={`${value}-${index}`} className="[font-size:var(--public-font-caption)] text-muted-foreground">{link.label || "聯絡方式"}：{value}</span>;
          })}
          {hidden.length > 0 && !showPrivateContacts && <button type="button" onClick={() => setShowPrivateContacts(true)} className="rounded-md border border-border px-2 py-1 [font-size:var(--public-font-caption)]">顯示聯絡方式</button>}
        </div>
      </div>
    </div>
    {showWorks && <PublicWorkLane works={works} />}
  </article>;
}
