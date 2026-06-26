"use client";

import type { AuthorLike, OrgLike } from "@write/public-ui";
import type { PublicOrg, PublicPersona } from "@/lib/types";
import { BuildingIcon, LinkIcon } from "./GalleryIcons";
import { PublicImage } from "@/components/PublicImage";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
];

function avatarColor(name: string | undefined): string {
  if (!name) return AVATAR_COLORS[0];
  const code = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[code];
}

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
    <div className="flex flex-wrap gap-1.5 mb-4">
      {allTags.map((tag) => {
        const active = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggleTag(tag)}
            className={`h-6 px-2.5 [font-size:var(--public-font-caption)] font-medium rounded-[5px] border transition-all duration-150 ${
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/50 bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
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
          className="h-6 px-2.5 [font-size:var(--public-font-caption)] rounded-[5px] border border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-border transition-all duration-150"
        >
          清除篩選
        </button>
      )}
    </div>
  );
}

// ── Author card ───────────────────────────────────────────────────────────────

function AuthorCard({ author, onTagClick }: { author: PublicPersona; onTagClick: (tag: string) => void }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden hover:-translate-y-[3px] hover:shadow-[0_4px_16px_hsl(var(--foreground)/0.07),0_1px_3px_hsl(var(--foreground)/0.05)] transition-all duration-200">
      <a href={`/author/${author.id}`} className="flex items-center gap-3 p-4">
        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
          {author.avatar ? (
            <PublicImage src={author.avatar} alt={author.displayName} preset="avatar" sizes="48px" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-base font-bold ${avatarColor(author.displayName)}`}>
              {author.displayName?.[0]}
            </div>
          )}
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
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {author.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className="[font-size:var(--public-font-caption)] px-2 py-0.5 rounded-[4px] border border-border/40 bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
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
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden hover:-translate-y-[3px] hover:shadow-[0_4px_16px_hsl(var(--foreground)/0.07),0_1px_3px_hsl(var(--foreground)/0.05)] transition-all duration-200">
      {/* Main org link — no nested anchors inside */}
      <a href={`/org/${org.id}`} className="flex items-center gap-3 p-4">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
          {org.logoUrl ? (
            <PublicImage src={org.logoUrl} alt={org.name} preset="logo" sizes="48px" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-base font-bold rounded-lg ${avatarColor(org.name)}`}>
              {org.name?.[0]}
            </div>
          )}
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
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {org.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              className="[font-size:var(--public-font-caption)] px-2 py-0.5 rounded-[4px] border border-border/40 bg-muted/40 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
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
  return <p className="[font-size:var(--public-font-body)] text-muted-foreground py-16 text-center">載入中...</p>;
}

function PeopleError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-16 text-center">
      <p className="[font-size:var(--public-font-body)] text-muted-foreground">載入失敗</p>
      <button type="button" onClick={onRetry} className="mt-2 [font-size:var(--public-font-body)] text-primary underline">重試</button>
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
          <p className="col-span-full py-16 text-center text-muted-foreground [font-size:var(--public-font-body)]">
            找不到符合的組織
          </p>
        )}
      </div>
    </div>
  );
}
