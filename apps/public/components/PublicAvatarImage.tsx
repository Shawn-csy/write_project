"use client";

import { useState } from "react";
import type { MediaCropLike } from "@write/media-crop";
import { PublicImage } from "./PublicImage";

interface Props {
  src?: string | null;
  name: string;
  preset?: "avatar" | "logo";
  crop?: MediaCropLike | null;
  sizes?: string;
  fallbackClassName?: string;
}

/** Keep an initial visible while an avatar loads or when its source fails. */
export function PublicAvatarImage({ src, name, preset = "avatar", crop, sizes, fallbackClassName = "bg-primary/10 text-primary" }: Props) {
  const [failedSrc, setFailedSrc] = useState("");
  const showImage = Boolean(src && failedSrc !== src);

  return (
    <>
      <span aria-hidden className={`flex h-full w-full items-center justify-center font-semibold ${fallbackClassName}`}>
        {name.trim().slice(0, 1) || "？"}
      </span>
      {showImage && <PublicImage src={src!} alt={name} preset={preset} crop={crop} sizes={sizes} onError={() => setFailedSrc(src!)} />}
    </>
  );
}
