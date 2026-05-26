import React from "react";

function buildTheme(seedText = "") {
  const seed = String(seedText || "Script").trim() || "Script";
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hue = hash % 360;
  return {
    hash,
    bgA: `hsl(${hue} 24% 66%)`,
    bgB: `hsl(${(hue + 32) % 360} 20% 58%)`,
    bgC: `hsl(${(hue + 76) % 360} 18% 50%)`,
    accent: `hsl(${(hue + 150) % 360} 24% 82%)`,
  };
}

export function CoverPlaceholder({ title = "Untitled", className = "", compact = false }) {
  const theme = React.useMemo(() => buildTheme(title), [title]);
  const titleText = String(title || "Untitled").trim() || "Untitled";
  const titleLen = titleText.length;
  const layoutVariant = theme.hash % 4;
  const isVerticalLayout = !compact && layoutVariant === 3;
  const isMixedLayout = layoutVariant === 2;
  const frameClass = compact
    ? "relative flex h-full w-full items-center justify-center px-2 py-2 text-center"
    : "relative flex h-full w-full items-center justify-center px-4 py-4 text-center";
  const titleClass = React.useMemo(() => {
    if (compact) {
      if (titleLen <= 8) return "mt-1 line-clamp-2 text-base font-extrabold leading-tight text-white drop-shadow";
      if (titleLen <= 16) return "mt-1 line-clamp-3 text-sm font-extrabold leading-tight text-white drop-shadow";
      if (titleLen <= 28) return "mt-1 line-clamp-4 text-xs font-bold leading-snug text-white drop-shadow";
      return "mt-1 line-clamp-5 text-[10px] font-bold leading-snug text-white drop-shadow";
    }
    if (titleLen <= 14) return "mt-2 line-clamp-2 text-3xl font-extrabold leading-tight text-white drop-shadow md:text-4xl";
    if (titleLen <= 28) return "mt-2 line-clamp-3 text-2xl font-extrabold leading-tight text-white drop-shadow md:text-3xl";
    return "mt-2 line-clamp-4 text-xl font-bold leading-snug text-white drop-shadow md:text-2xl";
  }, [compact, titleLen]);

  return (
    <div
      className={`${frameClass} ${className}`}
      style={{ background: `linear-gradient(130deg, ${theme.bgA}, ${theme.bgB} 48%, ${theme.bgC})` }}
      aria-label={titleText}
    >
      {theme.hash % 3 === 0 && (
        <>
          <div className="absolute -left-4 -top-5 h-16 w-16 rounded-full border border-white/35 bg-white/10" />
          <div className="absolute right-2 top-4 h-10 w-10 rotate-12 border border-white/40 bg-white/10" />
          <div className="absolute bottom-3 left-1/2 h-6 w-16 -translate-x-1/2 rounded-full border border-white/30 bg-black/10" />
        </>
      )}
      {theme.hash % 3 === 1 && (
        <>
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(0deg, rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.24) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
          <div className="absolute -right-5 top-3 h-16 w-16 rotate-45 border border-white/40 bg-white/10" />
          <div className="absolute left-3 bottom-3 h-8 w-8 rounded-full border border-white/35 bg-black/10" />
        </>
      )}
      {theme.hash % 3 === 2 && (
        <>
          <div className="absolute -left-6 bottom-3 h-20 w-20 rounded-full border border-white/35 bg-white/10" />
          <div className="absolute right-1 top-2 h-10 w-20 -skew-x-12 border border-white/35 bg-black/10" />
          <div className="absolute bottom-2 right-3 h-9 w-9 rotate-12 rounded-lg border border-white/30 bg-white/10" />
        </>
      )}
      <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.45), transparent 45%)" }} />
      <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 80% 85%, rgba(0,0,0,0.35), transparent 40%)" }} />
      <div
        className={`relative ${compact ? "max-w-[95%]" : "max-w-[85%]"} rounded-xl border border-white/25 bg-black/25 ${compact ? "px-2 py-2" : "px-5 py-4"} backdrop-blur-sm shadow-lg`}
        style={isMixedLayout ? { boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18), 0 10px 24px rgba(0,0,0,0.22)" } : undefined}
      >
        <div className="absolute -right-3 -top-3 h-6 w-6 rounded-full border border-white/40" style={{ backgroundColor: theme.accent }} />
        {!compact && <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">No Cover</div>}
        {isVerticalLayout ? (
          <div className="mt-2 flex items-center justify-center gap-3">
            <div
              className="max-h-[220px] text-2xl font-extrabold leading-none text-white drop-shadow md:text-3xl"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed", letterSpacing: "0.08em" }}
            >
              {titleText}
            </div>
            <div className="h-24 w-px bg-white/35" />
            <div className="text-left text-[11px] leading-relaxed text-white/80">
              script<br />placeholder
            </div>
          </div>
        ) : (
          <div className={titleClass}>{titleText}</div>
        )}
      </div>
    </div>
  );
}
