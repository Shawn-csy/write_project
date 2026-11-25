"use client";

import { useDirectoryRenderLimit } from "@/lib/useDirectoryRenderLimit";

import { useMemo, useState } from "react";
import type { AuthorLike, OrgLike } from "@write/public-ui";
import type { ExternalPublicScript, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import { authorDirectoryWorks } from "@/lib/authorDirectoryWorks";
import { PublicIdentityDirectoryRow } from "@/components/PublicIdentityDirectoryRow";
import { BuildingIcon, LinkIcon } from "./GalleryIcons";
import { PublicCardGridSkeleton } from "@/components/PublicSkeleton";
import { PublicEmptyState } from "@/components/PublicEmptyState";
import { PublicBrowseHeader } from "@/components/PublicBrowseHeader";
import { PublicAvatarImage } from "@/components/PublicAvatarImage";
import { publicAvatarColor } from "@/components/publicAvatarColor";
import { PublicSearchField } from "@/components/PublicSearchField";
import { GalleryViewModeToggle } from "./GalleryViewModeToggle";
import type { GalleryViewMode } from "@write/public-ui";

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
          className="tap-grow max-w-[9rem] shrink-0 truncate whitespace-nowrap [font-size:var(--public-font-caption)] px-2 py-0.5 rounded-sm bg-muted text-muted-foreground hover:text-link hover:underline"
        >
          {tag}
        </button>
      ))}
      {isCollapsed && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="tap-grow shrink-0 whitespace-nowrap [font-size:var(--public-font-caption)] text-link hover:underline"
          aria-label={`展開更多標籤，尚有 ${tags.length - limit} 個`}
        >
          更多（{tags.length - limit}）
        </button>
      )}
      {!isCollapsed && expanded && tags.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="tap-grow shrink-0 whitespace-nowrap [font-size:var(--public-font-caption)] text-link hover:underline"
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
  onResetFilters?: () => void;
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
            className={`h-6 px-2.5 [font-size:var(--public-font-caption)] font-medium rounded-md border ${
 active
 ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
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
          className="h-6 px-2.5 [font-size:var(--public-font-caption)] font-medium rounded-md border border-border bg-card text-link hover:bg-muted"
        >
          更多標籤（{hiddenCount}）
        </button>
      )}
      {!isCollapsed && expanded && allTags.length > PEOPLE_TAG_VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="h-6 px-2.5 [font-size:var(--public-font-caption)] rounded-md border border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
        >
          收合標籤
        </button>
      )}
      {selectedTags.length > 0 && onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="h-6 px-2.5 [font-size:var(--public-font-caption)] rounded-md border border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
        >
          清除篩選
        </button>
      )}
    </div>
  );
}

// ── Author card ───────────────────────────────────────────────────────────────

function AuthorAvatarTile({ author, workCount }: { author: PublicPersona; workCount: number }) {
  const href = author.externalHref || `/author/${author.id}`;
  return <a href={href} title={author.displayName} className="group min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link">
    <article className="min-w-0">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[3px] border border-border bg-muted group-hover:opacity-90">
        <PublicAvatarImage src={author.avatar} name={author.displayName} sizes="(min-width: 640px) 108px, 25vw" fallbackClassName={publicAvatarColor(author.displayName)} />
      </div>
      <h2 className="mt-1.5 line-clamp-2 min-h-[2.5em] break-words [font-size:var(--public-font-meta)] font-semibold leading-tight text-foreground group-hover:text-link">{author.displayName}</h2>
      <p className="mt-0.5 truncate [font-size:var(--public-font-caption)] text-muted-foreground">{workCount} 部作品</p>
    </article>
  </a>;
}

function AuthorCard({ author, works, onTagClick }: { author: PublicPersona; works: ReturnType<typeof authorDirectoryWorks>; onTagClick: (tag: string) => void }) {
  const href = author.externalHref || `/author/${author.id}`;
  const links = (Array.isArray(author.links) ? author.links : []).flatMap((link) =>
    link.url ? [{ label: link.label || "連結", url: link.url, isPublic: (link as { isPublic?: boolean }).isPublic === true, public: (link as { public?: boolean }).public === true }] : []);
  return <PublicIdentityDirectoryRow name={author.displayName} href={href} avatar={author.avatar} bio={author.bio}
    works={works} roleLabels={["台本師"]} tags={author.tags || []} links={links} onTagClick={onTagClick}
    extra={author.organizations?.length ? <p className="mt-0.5 flex items-center gap-1 [font-size:var(--public-font-caption)] text-muted-foreground"><BuildingIcon />{author.organizations.map((o) => o.name).join("、")}</p> : undefined} />;
}

// ── Org card ──────────────────────────────────────────────────────────────────

function OrgCard({ org, onTagClick }: { org: PublicOrg; onTagClick: (tag: string) => void }) {
  const memberCount = org.members?.length;
  const href = org.externalHref || `/org/${org.id}`;
  return (
    <div className="min-w-0 border-b border-border">
      {/* Main org link — no nested anchors inside */}
      <a href={href} className="group flex items-start gap-3 py-3">
        <div className="relative w-12 h-12 rounded-md border border-border overflow-hidden shrink-0">
          <PublicAvatarImage src={org.logoUrl} name={org.name} preset="logo" sizes="48px" fallbackClassName={publicAvatarColor(org.name)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold [font-size:var(--public-font-body)] truncate group-hover:text-link group-hover:underline">{org.name}</p>
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
        <div className="pb-2 pl-[3.75rem]">
          <a
            href={org.website}
            target="_blank"
            rel="noreferrer"
            className="[font-size:var(--public-font-caption)] text-link hover:underline truncate flex items-center gap-1"
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
  scripts?: PublicScript[];
  externalScripts?: ExternalPublicScript[];
  worksByAuthor?: Record<string, ReturnType<typeof authorDirectoryWorks>>;
  filteredAuthors: AuthorLike[];
  peopleStatus: PeopleStatus;
  onRetry: () => void;
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onResetFilters: () => void;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export function GalleryAuthorGrid({
  authors,
  scripts = [],
  externalScripts = [],
  worksByAuthor,
  filteredAuthors,
  peopleStatus,
  onRetry,
  allTags,
  selectedTags,
  onToggleTag,
  onResetFilters,
  searchTerm = "",
  onSearchChange,
}: GalleryAuthorGridProps) {
  const [viewMode, setViewMode] = useState<GalleryViewMode>("standard");
  const { limit: renderLimit, loadMoreRef } = useDirectoryRenderLimit(
    filteredAuthors.length,
    viewMode === "compact" ? 24 : 8,
    JSON.stringify([searchTerm, selectedTags]),
  );
  const authorById = useMemo(() => new Map(authors.map((author) => [author.id, author])), [authors]);
  if (peopleStatus === "loading" || peopleStatus === "idle") return <PeopleLoading />;
  if (peopleStatus === "error") return <PeopleError onRetry={onRetry} />;

  return (
    <div>
      <PublicBrowseHeader
        title="作者"
        count={`${filteredAuthors.length} 位`}
        search={onSearchChange && <PublicSearchField value={searchTerm} onChange={onSearchChange} placeholder="搜尋作者、作品或標籤" />}
        actions={<GalleryViewModeToggle value={viewMode} onChange={setViewMode} />}
      />
      <TagFilterChips
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={onToggleTag}
        onResetFilters={filteredAuthors.length ? onResetFilters : undefined}
      />
      <div className={viewMode === "compact" ? "grid grid-cols-4 gap-x-2 gap-y-4 min-[480px]:grid-cols-5 sm:grid-cols-[repeat(auto-fill,minmax(104px,1fr))] sm:gap-x-3 sm:gap-y-5 lg:grid-cols-[repeat(auto-fill,minmax(108px,1fr))] [&>*]:min-w-0" : undefined}>
        {filteredAuthors.slice(0, renderLimit).map((authorLike) => {
          const author = authorLike.id ? authorById.get(authorLike.id) : undefined;
          if (!author) return null;
          const works = worksByAuthor?.[author.id] ?? authorDirectoryWorks(author, scripts, externalScripts);
          return viewMode === "compact"
            ? <AuthorAvatarTile key={author.id} author={author} workCount={works.length} />
            : <AuthorCard key={author.id} author={author} works={works} onTagClick={onToggleTag} />;
        })}
        {filteredAuthors.length === 0 && (
          <PublicEmptyState
            className="col-span-full border-y border-border"
            title={authors.length || searchTerm.trim() || selectedTags.length ? "找不到符合的作者" : "目前沒有公開作者"}
            primaryAction={searchTerm.trim() && onSearchChange ? { label: "清除搜尋", onClick: () => onSearchChange("") } : selectedTags.length ? { label: "清除篩選", onClick: onResetFilters } : undefined}
            secondaryAction={searchTerm.trim() && onSearchChange && selectedTags.length ? { label: "清除篩選", onClick: onResetFilters } : undefined}
          />
        )}
      </div>
      {filteredAuthors.length > renderLimit && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
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
        onResetFilters={filteredOrgs.length ? onResetFilters : undefined}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredOrgs.map((orgLike) => {
          const org = orgLike.id ? orgById.get(orgLike.id) : undefined;
          if (!org) return null;
          return <OrgCard key={org.id} org={org} onTagClick={onToggleTag} />;
        })}
        {filteredOrgs.length === 0 && (
          <PublicEmptyState
            className="col-span-full border-y border-border"
            title={orgs.length || selectedTags.length ? "找不到符合的組織" : "目前沒有公開組織"}
            primaryAction={selectedTags.length ? { label: "清除篩選", onClick: onResetFilters } : undefined}
          />
        )}
      </div>
    </div>
  );
}
