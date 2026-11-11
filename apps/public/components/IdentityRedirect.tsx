"use client";

import { useEffect } from "react";

/**
 * Sends a retired profile address to the identity page that replaced it.
 * Used where the server cannot answer with an HTTP redirect (the static build).
 */
export function IdentityRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return (
    <main className="flex min-h-[50vh] items-center justify-center px-4 text-center">
      <p className="text-sm text-muted-foreground">
        這個頁面已搬到 <a href={href} className="text-primary underline underline-offset-2">新的個人頁</a>…
      </p>
    </main>
  );
}
