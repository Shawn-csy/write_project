import type { ReactNode } from "react";
import type { MediaCropLike } from "@write/media-crop";
import type { PublicOrg } from "@/lib/types";
import { PublicImage } from "./PublicImage";

type OrgIdentity = Pick<PublicOrg, "name" | "description" | "logoUrl" | "bannerUrl" | "bannerCrop"> & {
  logoCrop?: MediaCropLike | null;
};

export function PublicOrgMasthead({ org, children, leading }: { org: OrgIdentity; children?: ReactNode; leading?: ReactNode }) {
  const { name, description, logoUrl, bannerUrl, bannerCrop, logoCrop } = org;
  return (
    <header className="mb-4 sm:mb-5">
      {leading && <div className="mb-2">{leading}</div>}
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-inset ring-border">
        {bannerUrl && <div className="relative h-24 overflow-hidden bg-muted sm:h-32">
          <PublicImage src={bannerUrl} alt="" preset="org-banner" crop={bannerCrop} />
        </div>}
        <div className="relative px-3.5 pb-3 sm:px-5 sm:pb-4">
          <div className={`flex min-w-0 gap-3 sm:gap-4 ${bannerUrl ? "items-start" : "items-center pt-3 sm:pt-4"}`}>
            <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-card bg-muted text-lg font-semibold text-muted-foreground shadow-sm sm:h-20 sm:w-20 ${bannerUrl ? "-mt-6 sm:-mt-8" : ""}`} aria-hidden>
              {logoUrl ? <PublicImage src={logoUrl} alt="" preset="logo" crop={logoCrop} sizes="80px" /> : Array.from(name.trim())[0]}
            </span>
            <h1 className={`min-w-0 break-words text-xl font-bold leading-tight sm:text-3xl ${bannerUrl ? "pt-1.5 sm:pt-2" : ""}`}>{name}</h1>
          </div>
          {description && <p className="mt-2 max-w-[68ch] whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85">{description}</p>}
          {children && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">{children}</div>}
        </div>
      </div>
    </header>
  );
}
