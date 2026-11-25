import type { ReactNode } from "react";

/** Shared gutters and vertical rhythm for the public browsing pages. */
export function PublicBrowseMain({ children, width = "standard", className = "" }: {
  children: ReactNode;
  width?: "standard" | "wide" | "narrow";
  className?: string;
}) {
  const widthClass = { standard: "max-w-6xl", wide: "", narrow: "max-w-2xl" }[width];
  return <main className={`mx-auto w-full min-w-0 flex-1 px-4 pb-5 pt-3 sm:px-6 sm:pb-6 sm:pt-4 lg:px-8 lg:pt-5 ${widthClass} ${className}`}>{children}</main>;
}
