/**
 * PublicImage — Next.js image optimization primitive for public site covers/avatars.
 *
 * Wraps next/image fill mode. Callers pass src + style from getMediaCropStyle().
 * Falls back to empty state when src is absent.
 * Parent must be position:relative with explicit dimensions.
 */

import Image from "next/image";

interface Props {
  src: string;
  alt: string;
  sizes: string;
  /** object-position / object-fit style from getMediaCropStyle() */
  style?: React.CSSProperties;
  className?: string;
}

export function PublicImage({ src, alt, sizes, style, className }: Props) {
  if (!src) return null;

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      style={{ objectFit: "cover", ...style }}
      className={className}
    />
  );
}
