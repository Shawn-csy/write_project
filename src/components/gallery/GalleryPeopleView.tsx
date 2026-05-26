import { AuthorGalleryCard } from "./AuthorGalleryCard";
import { OrgGalleryCard } from "./OrgGalleryCard";
import type { PublicGalleryAuthor } from "../../hooks/public/usePublicGalleryState";

interface OrgLike {
  id?: string;
  name?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface AuthorsViewProps {
  t: (key: string) => string;
  isLoadingPeople: boolean;
  filteredAuthors: PublicGalleryAuthor[];
  onAuthorClick: (id: string) => void;
  onAuthorTagClick: (tag: string) => void;
}

export function GalleryAuthorsView({ t, isLoadingPeople, filteredAuthors, onAuthorClick, onAuthorTagClick }: AuthorsViewProps) {
  if (isLoadingPeople) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-lg" />)}
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        {filteredAuthors
          .filter((a): a is PublicGalleryAuthor & { id: string } => typeof a.id === "string" && a.id.length > 0)
          .map(author => (
            <AuthorGalleryCard
              key={author.id}
              author={author}
              onClick={() => onAuthorClick(author.id as string)}
              onTagClick={onAuthorTagClick}
            />
          ))}
      </div>
      {filteredAuthors.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground py-10">
          <p>{t("publicGallery.emptyAuthors")}</p>
        </div>
      )}
    </>
  );
}

interface OrgsViewProps {
  t: (key: string) => string;
  isLoadingPeople: boolean;
  filteredOrgs: OrgLike[];
  onOrgClick: (id: string) => void;
  onOrgTagClick: (tag: string) => void;
}

export function GalleryOrgsView({ t, isLoadingPeople, filteredOrgs, onOrgClick, onOrgTagClick }: OrgsViewProps) {
  if (isLoadingPeople) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-lg" />)}
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        {filteredOrgs
          .filter((o): o is OrgLike & { id: string } => typeof o.id === "string" && o.id.length > 0)
          .map(org => (
            <OrgGalleryCard
              key={org.id}
              org={org}
              onClick={() => onOrgClick(org.id)}
              onTagClick={onOrgTagClick}
            />
          ))}
      </div>
      {filteredOrgs.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground py-10">
          <p>{t("publicGallery.emptyOrgs")}</p>
        </div>
      )}
    </>
  );
}
