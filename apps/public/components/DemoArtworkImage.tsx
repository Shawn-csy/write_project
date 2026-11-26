"use client";

import { useEffect, useRef, useState } from "react";
import { PublicImage } from "./PublicImage";

export function DemoArtworkImage(props: { sources: string[]; alt: string; className?: string }) {
  return <DemoArtworkAttempt key={JSON.stringify(props.sources)} {...props} />;
}

function DemoArtworkAttempt({ sources, alt, className }: { sources: string[]; alt: string; className?: string }) {
  const [index, setIndex] = useState(0);
  const image = useRef<HTMLSpanElement>(null);
  const src = sources[index];

  useEffect(() => {
    const img = image.current?.querySelector("img");
    // A failed image in the static HTML can finish loading before hydration attaches onError.
    if (img?.currentSrc && img.complete && img.naturalWidth === 0) {
      setIndex((current) => current === index ? current + 1 : current);
    }
  }, [index]);

  if (!src) return null;
  return (
    <span ref={image}>
      <PublicImage
        key={src}
        src={src}
        alt={alt}
        preset="script-cover"
        className={className}
        onError={() => setIndex((current) => current === index ? current + 1 : current)}
      />
    </span>
  );
}
