"use client";

import { createContext, useContext, useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { PublicImage } from "./PublicImage";

const CardMediaActive = createContext(true);
const EagerCardCover = createContext(false);

/** Only first-fold covers use eager fetch; avatars remain low priority. */
export function CardCoverPriority({ eager, children }: { eager: boolean; children: ReactNode }) {
  return <EagerCardCover.Provider value={eager}>{children}</EagerCardCover.Provider>;
}

/** Keep card text and links in the initial HTML while deferring offscreen media. */
export function CardMediaRegion({ defer = false, children }: { defer?: boolean; children: ReactNode }) {
  const [active, setActive] = useState(!defer);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active || !defer) return;
    const region = regionRef.current;
    if (!region || typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setActive(true);
        observer.disconnect();
      }
    });
    observer.observe(region);
    return () => observer.disconnect();
  }, [active, defer]);

  return (
    <CardMediaActive.Provider value={active}>
      <div ref={regionRef}>{children}</div>
    </CardMediaActive.Provider>
  );
}

export function CardMediaImage(props: ComponentProps<typeof PublicImage>) {
  const active = useContext(CardMediaActive);
  const eagerCover = useContext(EagerCardCover)
    && (props.preset === "script-cover" || props.preset === "series-cover");
  return active ? <PublicImage {...props} eager={props.eager ?? eagerCover} /> : null;
}
