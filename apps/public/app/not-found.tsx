"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { NotFoundContent } from "@/components/NotFoundContent";

// Only the static build ever reaches these branches; lazy keeps the live pages
// out of the 404 bundle of a normal Next deployment.
const LiveEntityRoute = lazy(() => import("@/components/LiveEntityPages").then((m) => ({ default: m.LiveEntityRoute })));
const LiveReader = lazy(() => import("./read/[id]/LiveReader").then((m) => ({ default: m.LiveReader })));

/**
 * In the static Pages build this file becomes 404.html, which Pages serves for
 * every address with no prebuilt page, notably a work or an author, tag or
 * series that appeared after the last build. It looks at the address in the
 * browser: a /read/<id> or an author / org / tag / series address is loaded
 * live, anything else is a real 404. A normal Next deployment renders the 404
 * on the server and skips this.
 */
const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

type Resolved = { kind: "pending" } | { kind: "missing" } | { kind: "read"; id: string } | { kind: "entity"; pathname: string };

const ENTITY_PATH = /^\/(?:author|org|tag|series)\/[^/]+(?:\/[^/]+)?\/?$/;

function resolveLocation(): Resolved {
  const match = window.location.pathname.match(/^\/read\/([^/]+)\/?$/);
  if (!match) {
    const { pathname } = window.location;
    return ENTITY_PATH.test(pathname) ? { kind: "entity", pathname } : { kind: "missing" };
  }
  try {
    return { kind: "read", id: decodeURIComponent(match[1]) };
  } catch {
    return { kind: "missing" };
  }
}

export default function NotFound() {
  const [resolved, setResolved] = useState<Resolved>(STATIC_EXPORT ? { kind: "pending" } : { kind: "missing" });

  useEffect(() => {
    if (STATIC_EXPORT) setResolved(resolveLocation());
  }, []);

  const blank = <div className="min-h-screen" aria-busy="true" />;
  if (resolved.kind === "read") {
    return (
      <Suspense fallback={blank}>
        <LiveReader scriptId={resolved.id} />
      </Suspense>
    );
  }
  if (resolved.kind === "entity") {
    return (
      <Suspense fallback={blank}>
        <LiveEntityRoute pathname={resolved.pathname} />
      </Suspense>
    );
  }
  if (resolved.kind === "pending") {
    return (
      <>
        <noscript>
          <p style={{ padding: "2rem", textAlign: "center" }}>找不到這個頁面，或需要啟用 JavaScript 才能閱讀。</p>
        </noscript>
        {blank}
      </>
    );
  }
  return <NotFoundContent />;
}
