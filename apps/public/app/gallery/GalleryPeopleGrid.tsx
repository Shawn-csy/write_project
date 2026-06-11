"use client";

import type { AuthorLike, OrgLike } from "@write/public-ui";
import type { PublicOrg, PublicPersona } from "@/lib/types";

function AuthorCard({ author }: { author: PublicPersona }) {
  return (
    <a
      href={`/author/${author.id}`}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-4 hover:border-primary/50 transition-colors"
    >
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
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{author.displayName}</p>
        {author.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{author.bio}</p>
        )}
      </div>
    </a>
  );
}

function OrgCard({ org }: { org: PublicOrg }) {
  return (
    <a
      href={`/org/${org.id}`}
      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background p-4 hover:border-primary/50 transition-colors"
    >
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
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{org.name}</p>
        {org.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{org.description}</p>
        )}
      </div>
    </a>
  );
}

interface GalleryAuthorGridProps {
  authors: PublicPersona[];
  filteredAuthors: AuthorLike[];
  loading: boolean;
}

export function GalleryAuthorGrid({
  authors,
  filteredAuthors,
  loading,
}: GalleryAuthorGridProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground py-16 text-center">載入中...</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filteredAuthors.map((authorLike) => {
        const author = authors.find((item) => item.id === authorLike.id);
        if (!author) return null;
        return <AuthorCard key={author.id} author={author} />;
      })}
      {filteredAuthors.length === 0 && (
        <p className="col-span-full py-16 text-center text-muted-foreground text-sm">
          找不到符合的作者
        </p>
      )}
    </div>
  );
}

interface GalleryOrgGridProps {
  orgs: PublicOrg[];
  filteredOrgs: OrgLike[];
  loading: boolean;
}

export function GalleryOrgGrid({
  orgs,
  filteredOrgs,
  loading,
}: GalleryOrgGridProps) {
  if (loading) {
    return <p className="text-sm text-muted-foreground py-16 text-center">載入中...</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {filteredOrgs.map((orgLike) => {
        const org = orgs.find((item) => item.id === orgLike.id);
        if (!org) return null;
        return <OrgCard key={org.id} org={org} />;
      })}
      {filteredOrgs.length === 0 && (
        <p className="col-span-full py-16 text-center text-muted-foreground text-sm">
          找不到符合的組織
        </p>
      )}
    </div>
  );
}
