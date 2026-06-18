"use client";

import { useCallback, useState } from "react";

export function usePublicReaderShare() {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    const reset = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(reset).catch(() => {
        window.prompt("複製連結：", url);
      });
    } else {
      window.prompt("複製連結：", url);
    }
  }, []);

  return { handleShare, copied };
}
