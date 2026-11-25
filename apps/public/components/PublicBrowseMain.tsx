import type { ReactNode } from "react";

/** Shared gutters and vertical rhythm for the public browsing pages. */
export function PublicBrowseMain({ children, width = "standard", className = "" }: {
  children: ReactNode;
  width?: "standard" | "wide" | "narrow";
  className?: string;
}) {
  const widthClass = { standard: "max-w-6xl", wide: "", narrow: "max-w-2xl" }[width];
  return <main className={`mx-auto w-full min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 ${widthClass} ${className}`}>{children}</main>;
}
