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

export function demoArtwork(demoUrl: string, demoCoverUrl = "", scriptCoverUrl = ""): string {
  return youtubeThumbnail(demoUrl) || demoCoverUrl || scriptCoverUrl;
}
