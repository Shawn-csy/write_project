export function youtubeThumbnail(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const videoId = host === "youtu.be"
      ? parsed.pathname.split("/").filter(Boolean)[0]
      : host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com"
        ? parsed.searchParams.get("v") || parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1]
        : null;
    return videoId ? `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "";
  } catch {
    return "";
  }
}

export function demoArtworkSources(demoUrl: string, coverUrl = "", scriptCoverUrl = ""): string[] {
  // Skip signed Meta images whose URLs expire independently of the public catalog.
  const temporaryCover = /^https:\/\/[^/]*\.fbcdn\.net\//i.test(coverUrl)
    && /[?&]oe=/i.test(coverUrl);
  return [...new Set([temporaryCover ? "" : coverUrl, youtubeThumbnail(demoUrl), scriptCoverUrl]
    .map((src) => src.trim()).filter(Boolean))];
}

export function demoArtwork(demoUrl: string, coverUrl = "", scriptCoverUrl = ""): string {
  return demoArtworkSources(demoUrl, coverUrl, scriptCoverUrl)[0] || "";
}
