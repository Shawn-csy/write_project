import React from "react";

const COMPACT_WIDTH = 160;
const COMPACT_HEIGHT = 240;

/** Flat low-chroma grounds; the title picks one so the same script always gets the same colour. */
const GROUNDS = [
  "hsl(212 16% 78%)",
  "hsl(200 12% 80%)",
  "hsl(160 10% 79%)",
  "hsl(28 14% 81%)",
  "hsl(350 12% 82%)",
  "hsl(260 10% 82%)",
];

function buildTheme(seedText = "") {
  const seed = String(seedText || "Script").trim() || "Script";
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return { hash, ground: GROUNDS[hash % GROUNDS.length] };
}

interface CoverPlaceholderProps {
  title?: string;
  className?: string;
  compact?: boolean;
}

export function CoverPlaceholder({ title = "Untitled", className = "", compact = false }: CoverPlaceholderProps) {
  const compactRootRef = React.useRef<HTMLDivElement>(null);
  const [compactSize, setCompactSize] = React.useState<{ width: number; height: number } | null>(null);

  React.useEffect(() => {
    if (!compact || !compactRootRef.current) return;
    const root = compactRootRef.current;
    const update = () => {
      const rect = root.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setCompactSize({ width: rect.width, height: rect.height });
      }
    };
    update();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(root);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [compact]);

  const theme = React.useMemo(() => buildTheme(title), [title]);
  const titleText = String(title || "Untitled").trim() || "Untitled";
  const titleLen = titleText.length;
  const frameClass = compact
    ? "relative flex h-full w-full items-center justify-center px-3 py-3 text-center"
    : "relative flex h-full w-full items-center justify-center px-6 py-6 text-center";
  const titleClass = React.useMemo(() => {
    const ink = "font-bold text-[hsl(215_14%_24%)]";
    if (compact) {
      if (titleLen <= 8) return `line-clamp-3 text-base leading-snug ${ink}`;
      if (titleLen <= 16) return `line-clamp-4 text-sm leading-snug ${ink}`;
      if (titleLen <= 28) return `line-clamp-5 text-xs leading-snug ${ink}`;
      return `line-clamp-6 text-[10px] leading-snug ${ink}`;
    }
    if (titleLen <= 14) return `line-clamp-3 text-2xl leading-snug md:text-3xl ${ink}`;
    if (titleLen <= 28) return `line-clamp-4 text-xl leading-snug md:text-2xl ${ink}`;
    return `line-clamp-5 text-lg leading-snug md:text-xl ${ink}`;
  }, [compact, titleLen]);

  const cover = (
    <div
      className={`${frameClass} ${compact ? "" : className}`}
      style={{ background: theme.ground }}
      aria-label={titleText}
    >
      <div className={titleClass}>{titleText}</div>
    </div>
  );

  if (!compact) return cover;

  const scale = compactSize
    ? Math.min(compactSize.width / COMPACT_WIDTH, compactSize.height / COMPACT_HEIGHT)
    : 1;
  return (
    <div ref={compactRootRef} className={`relative h-full w-full overflow-hidden ${className}`} aria-label={titleText}>
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2"
        style={{
          width: COMPACT_WIDTH,
          height: COMPACT_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          visibility: compactSize ? "visible" : "hidden",
        }}
      >
        {cover}
      </div>
    </div>
  );
}
