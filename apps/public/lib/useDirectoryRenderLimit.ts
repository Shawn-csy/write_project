"use client";

import { useEffect, useRef, useState } from "react";

export function useDirectoryRenderLimit(total: number, pageSize: number, filterKey: string) {
  const [page, setPage] = useState({ filterKey, pageSize, limit: pageSize });
  const limit = page.filterKey === filterKey && page.pageSize === pageSize ? page.limit : pageSize;
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || limit >= total) return;
    if (typeof IntersectionObserver === "undefined") {
      setPage({ filterKey, pageSize, limit: total });
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setPage({ filterKey, pageSize, limit: Math.min(limit + pageSize, total) });
    }, { rootMargin: "240px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [filterKey, limit, pageSize, total]);

  return { limit, loadMoreRef };
}
