"use client";

import { useMemo, useState } from "react";
import type { AuthorLike, OrgLike } from "@write/public-ui";
import type { PublicOrg, PublicPersona } from "@/lib/types";
import { BuildingIcon, LinkIcon } from "./GalleryIcons";
import { PublicCardGridSkeleton } from "@/components/PublicSkeleton";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicAvatarImage } from "@/components/PublicAvatarImage";
import { publicAvatarColor } from "@/components/publicAvatarColor";

const PEOPLE_TAG_VISIBLE_COUNT = 8;
const CARD_TAG_VISIBLE_COUNT = 4;

interface CollapsedTagButtonsProps {
  tags: string[];
  onTagClick: (tag: string) => void;
  limit: number;
  className?: string;
  singleRow?: boolean;
}

function CollapsedTagButtons({ tags, onTagClick, limit, className = "", singleRow = false }: CollapsedTagButtonsProps) {
  const [expanded, setExpanded] = useState(false);
  const isCollapsed = !expanded && tags.length > limit;
  const visibleTags = isCollapsed ? tags.slice(0, limit) : tags;

  return (
    <div className={`flex gap-1.5 ${singleRow && !expanded ? "flex-nowrap overflow-hidden" : "flex-wrap"} ${className}`}>
      {visibleTags.map((tag) => (
        <button
          key={tag}
          type="button"
          onClick={() => onTagClick(tag)}
          className="[font-size:var(--public-font-caption)] px-2 py-0.5 rounded-md border border-border/40 bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
        >
          {tag}
        </button>
      ))}
      {isCollapsed && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="[font-size:var(--public-font-caption)] px-2 py-0.5 rounded-md border border-border/40 bg-transparent text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-150"
          aria-label={`展開更多標籤，尚有 ${tags.length - limit} 個`}
        >
          更多（{tags.length - limit}）
        </button>
      )}
      {!isCollapsed && expanded && tags.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="[font-size:var(--public-font-caption)] px-2 py-0.5 rounded-md border border-border/40 bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
        >
          收合
        </button>
      )}
    </div>
  );
}

// ── Tag filter chips ──────────────────────────────────────────────────────────

interface TagFilterChipsProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onResetFilters: () => void;
}

function TagFilterChips({ allTags, selectedTags, onToggleTag, onResetFilters }: TagFilterChipsProps) {
  const [expanded, setExpanded] = useState(false);
  if (allTags.length === 0) return null;
  const isCollapsed = !expanded && allTags.length > PEOPLE_TAG_VISIBLE_COUNT;
  const visibleTags = isCollapsed
    ? (() => {
        const firstTags = allTags.slice(0, PEOPLE_TAG_VISIBLE_COUNT);
        const selectedHidden = allTags
          .slice(PEOPLE_TAG_VISIBLE_COUNT)
          .filter((tag) => selectedTags.includes(tag));
        const firstTagSet = new Set(firstTags);
        return [...firstTags, ...selectedHidden.filter((tag) => !firstTagSet.has(tag))];
      })()
    : allTags;
  const hiddenCount = allTags.length - visibleTags.length;

  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {visibleTags.map((tag) => {
        const active = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggleTag(tag)}
            className={`h-6 px-2.5 [font-size:var(--public-font-caption)] font-medium rounded-md border transition-all duration-150 ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/50 bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            }`}
          >
            {tag}
          </button>
        );
      })}
      {isCollapsed && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="h-6 px-2.5 [font-size:var(--public-font-caption)] font-medium rounded-md border border-primary/35 bg-primary/5 text-primary hover:border-primary/60 hover:bg-primary/10 transition-all duration-150"
        >
          更多標籤（{hiddenCount}）
        </button>
      )}
      {!isCollapsed && expanded && allTags.length > PEOPLE_TAG_VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="h-6 px-2.5 [font-size:var(--public-font-caption)] rounded-md border border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-border transition-all duration-150"
        >
          收合標籤
        </button>
      )}
      {selectedTags.length > 0 && (
        <button
          type="button"
          onClick={onResetFilters}
          className="h-6 px-2.5 [font-size:var(--public-font-caption)] rounded-md border border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-border transition-all duration-150"
        >
          清除篩選
        </button>
      )}
    </div>
  );
}

// ── Author card ───────────────────────────────────────────────────────────────

function AuthorCard({ author, onTagClick }: { author: PublicPersona; onTagClick: (tag: string) => void }) {
  const href = author.externalHref || `/author/${author.id}`;
  return (
    <div className="flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden hover:-translate-y-[3px] hover:shadow-[0_4px_16px_hsl(var(--foreground)/0.07),0_1px_3px_hsl(var(--foreground)/0.05)] transition-all duration-200">
      <a href={href} className="flex items-center gap-3 p-3">
        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
          <PublicAvatarImage src={author.avatar} name={author.displayName} sizes="48px" fallbackClassName={publicAvatarColor(author.displayName)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium [font-size:var(--public-font-body)] truncate">{author.displayName}</p>
          {author.bio && (
            <p className="[font-size:var(--public-font-caption)] text-muted-foreground line-clamp-2 mt-0.5">{author.bio}</p>
          )}
          {author.organizations && author.organizations.length > 0 && (
            <p className="[font-size:var(--public-font-caption)] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
              <BuildingIcon />
              {author.organizations.map((o) => o.name).join("、")}
            </p>
          )}
        </div>
      </a>
      {author.tags && author.tags.length > 0 && (
        <CollapsedTagButtons
          tags={author.tags}
          onTagClick={onTagClick}
          limit={3}
          singleRow
          className="max-w-full px-3 pb-2"
        />
      )}
    </div>
  );
}

// ── Org card ──────────────────────────────────────────────────────────────────

function OrgCard({ org, onTagClick }: { org: PublicOrg; onTagClick: (tag: string) => void }) {
  const memberCount = org.members?.length;
  const href = org.externalHref || `/org/${org.id}`;
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden hover:-translate-y-[3px] hover:shadow-[0_4px_16px_hsl(var(--foreground)/0.07),0_1px_3px_hsl(var(--foreground)/0.05)] transition-all duration-200">
      {/* Main org link — no nested anchors inside */}
      <a href={href} className="flex items-center gap-3 p-4">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
          <PublicAvatarImage src={org.logoUrl} name={org.name} preset="logo" sizes="48px" fallbackClassName={publicAvatarColor(org.name)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium [font-size:var(--public-font-body)] truncate">{org.name}</p>
          {org.description && (
            <p className="[font-size:var(--public-font-caption)] text-muted-foreground line-clamp-2 mt-0.5">{org.description}</p>
          )}
          {memberCount != null && memberCount > 0 && (
            <p className="[font-size:var(--public-font-caption)] text-muted-foreground mt-0.5">{memberCount} 位成員</p>
          )}
        </div>
      </a>
      {/* Website link — sibling, not nested inside the org anchor */}
      {org.website && (
        <div className="px-4 pb-2">
          <a
            href={org.website}
            target="_blank"
            rel="noreferrer"
            className="[font-size:var(--public-font-caption)] text-primary hover:underline truncate flex items-center gap-1"
          >
            <LinkIcon />
            {org.website}
          </a>
        </div>
      )}
      {/* Tag chips — sibling buttons, not nested inside the org anchor */}
      {org.tags && org.tags.length > 0 && (
        <CollapsedTagButtons
          tags={org.tags}
          onTagClick={onTagClick}
          limit={CARD_TAG_VISIBLE_COUNT}
          className="px-4 pb-3"
        />
      )}
    </div>
  );
}

// ── Shared loading/error states ───────────────────────────────────────────────

type PeopleStatus = "idle" | "loading" | "loaded" | "error";

function PeopleLoading() {
  return <PublicCardGridSkeleton count={8} minCardWidth={240} aspect="aspect-[5/2]" />;
}

function PeopleError({ onRetry }: { onRetry: () => void }) {
  return (
    <PublicEmptyState
      title="載入失敗"
      description="可能是網路不穩，請重新載入，或稍後再試。"
      primaryAction={{ label: "重試", onClick: onRetry }}
      secondaryAction={{ label: "回到台本首頁", href: "/" }}
    />
  );
}

// ── GalleryAuthorGrid ─────────────────────────────────────────────────────────

interface GalleryAuthorGridProps {
  authors: PublicPersona[];
  filteredAuthors: AuthorLike[];
  peopleStatus: PeopleStatus;
  onRetry: () => void;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onResetFilters: () => void;
}

export function GalleryAuthorGrid({
  authors,
  filteredAuthors,
  peopleStatus,
  onRetry,
  allTags,
  selectedTags,
  onToggleTag,
  onResetFilters,
}: GalleryAuthorGridProps) {
  const authorById = useMemo(() => new Map(authors.map((author) => [author.id, author])), [authors]);
  if (peopleStatus === "loading" || peopleStatus === "idle") return <PeopleLoading />;
  if (peopleStatus === "error") return <PeopleError onRetry={onRetry} />;

  return (
    <div>
      <PublicBrowseHeader title="作者" count={`${filteredAuthors.length} 位`} />
      <TagFilterChips
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={onToggleTag}
        onResetFilters={onResetFilters}
      />
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAuthors.map((authorLike) => {
          const author = authorLike.id ? authorById.get(authorLike.id) : undefined;
          if (!author) return null;
          return <AuthorCard key={author.id} author={author} onTagClick={onToggleTag} />;
        })}
        {filteredAuthors.length === 0 && (
          <p className="col-span-full py-16 text-center text-muted-foreground [font-size:var(--public-font-body)]">
            找不到符合的作者
          </p>
        )}
      </div>
    </div>
  );
}

// ── GalleryOrgGrid ────────────────────────────────────────────────────────────

interface GalleryOrgGridProps {
  orgs: PublicOrg[];
  filteredOrgs: OrgLike[];
  peopleStatus: PeopleStatus;
  onRetry: () => void;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onResetFilters: () => void;
}

export function GalleryOrgGrid({
  orgs,
  filteredOrgs,
  peopleStatus,
  onRetry,
  allTags,
  selectedTags,
  onToggleTag,
  onResetFilters,
}: GalleryOrgGridProps) {
  const orgById = useMemo(() => new Map(orgs.map((org) => [org.id, org])), [orgs]);
  if (peopleStatus === "loading" || peopleStatus === "idle") return <PeopleLoading />;
  if (peopleStatus === "error") return <PeopleError onRetry={onRetry} />;

  return (
    <div>
      <PublicBrowseHeader title="組織" count={`${filteredOrgs.length} 個`} />
      <TagFilterChips
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={onToggleTag}
        onResetFilters={onResetFilters}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredOrgs.map((orgLike) => {
          const org = orgLike.id ? orgById.get(orgLike.id) : undefined;
          if (!org) return null;
          return <OrgCard key={org.id} org={org} onTagClick={onToggleTag} />;
        })}
        {filteredOrgs.length === 0 && (
          <p className="col-span-full py-16 text-center text-muted-foreground [font-size:var(--public-font-body)]">
            找不到符合的組織
          </p>
        )}
      </div>
    </div>
  );
}
