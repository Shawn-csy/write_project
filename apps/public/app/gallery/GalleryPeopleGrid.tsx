"use client";

import type { AuthorLike, OrgLike } from "@write/public-ui";
import type { PublicOrg, PublicPersona } from "@/lib/types";

// ── Tag filter chips ──────────────────────────────────────────────────────────

interface TagFilterChipsProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onResetFilters: () => void;
}

function TagFilterChips({ allTags, selectedTags, onToggleTag, onResetFilters }: TagFilterChipsProps) {
  if (allTags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {allTags.map((tag) => {
        const active = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggleTag(tag)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              active
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border/60 bg-muted/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
            }`}
          >
            {tag}
          </button>
        );
      })}
      {selectedTags.length > 0 && (
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs px-2.5 py-1 rounded-full border border-border/60 bg-background text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕ 清除篩選
        </button>
      )}
    </div>
  );
}

// ── Author card ───────────────────────────────────────────────────────────────

function AuthorCard({ author, onTagClick }: { author: PublicPersona; onTagClick: (tag: string) => void }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background overflow-hidden hover:border-primary/50 transition-colors">
      <a href={`/author/${author.id}`} className="flex items-center gap-3 p-4">
        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0">
          {author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar} alt={author.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
              {author.displayName?.[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{author.displayName}</p>
          {author.bio && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{author.bio}</p>
          )}
          {author.organizations && author.organizations.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              🏢 {author.organizations.map((o) => o.name).join("、")}
            </p>
          )}
        </div>
      </a>
      {author.tags && author.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {author.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className="text-xs px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Org card ──────────────────────────────────────────────────────────────────

function OrgCard({ org, onTagClick }: { org: PublicOrg; onTagClick: (tag: string) => void }) {
  const memberCount = org.members?.length;
  return (
    <div className="rounded-xl border border-border/60 bg-background overflow-hidden hover:border-primary/50 transition-colors">
      {/* Main org link — no nested anchors inside */}
      <a href={`/org/${org.id}`} className="flex items-center gap-3 p-4">
        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
              {org.name?.[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{org.name}</p>
          {org.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{org.description}</p>
          )}
          {memberCount != null && memberCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{memberCount} 位成員</p>
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
            className="text-xs text-primary hover:underline truncate block"
          >
            🔗 {org.website}
          </a>
        </div>
      )}
      {/* Tag chips — sibling buttons, not nested inside the org anchor */}
      {org.tags && org.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {org.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className="text-xs px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared loading/error states ───────────────────────────────────────────────

type PeopleStatus = "idle" | "loading" | "loaded" | "error";

function PeopleLoading() {
  return <p className="text-sm text-muted-foreground py-16 text-center">載入中...</p>;
}

function PeopleError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-muted-foreground">載入失敗</p>
      <button type="button" onClick={onRetry} className="mt-2 text-sm text-primary underline">重試</button>
    </div>
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
  if (peopleStatus === "loading" || peopleStatus === "idle") return <PeopleLoading />;
  if (peopleStatus === "error") return <PeopleError onRetry={onRetry} />;

  return (
    <div>
      <TagFilterChips
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={onToggleTag}
        onResetFilters={onResetFilters}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAuthors.map((authorLike) => {
          const author = authors.find((item) => item.id === authorLike.id);
          if (!author) return null;
          return <AuthorCard key={author.id} author={author} onTagClick={onToggleTag} />;
        })}
        {filteredAuthors.length === 0 && (
          <p className="col-span-full py-16 text-center text-muted-foreground text-sm">
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
  if (peopleStatus === "loading" || peopleStatus === "idle") return <PeopleLoading />;
  if (peopleStatus === "error") return <PeopleError onRetry={onRetry} />;

  return (
    <div>
      <TagFilterChips
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={onToggleTag}
        onResetFilters={onResetFilters}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredOrgs.map((orgLike) => {
          const org = orgs.find((item) => item.id === orgLike.id);
          if (!org) return null;
          return <OrgCard key={org.id} org={org} onTagClick={onToggleTag} />;
        })}
        {filteredOrgs.length === 0 && (
          <p className="col-span-full py-16 text-center text-muted-foreground text-sm">
            找不到符合的組織
          </p>
        )}
      </div>
    </div>
  );
}
