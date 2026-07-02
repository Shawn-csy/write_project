# Public SEO Pre-Index Checklist

Run before requesting a Google recrawl or submitting to Search Console.

## 1. Favicon

```bash
curl -sI https://open-scripts.shawnup.com/favicon.ico | head -5
```

Expected: `HTTP/2 200`, `content-type: image/x-icon` (or `image/vnd.microsoft.icon`).

```bash
curl -sI https://open-scripts.shawnup.com/favicon.svg | head -5
```

Expected: `HTTP/2 200`, `content-type: image/svg+xml`.

```bash
curl -sI https://open-scripts.shawnup.com/apple-touch-icon.png | head -5
```

Expected: `HTTP/2 200`, `content-type: image/png`.

## 2. robots.txt

```bash
curl -s https://open-scripts.shawnup.com/robots.txt
```

Must contain:
- `User-agent: *` block with `Allow: /` and `Allow: /read/`
- Public reader pages not blocked: `/read/`, `/author/`, `/org/`, `/series/` must NOT appear under `Disallow`
- `Disallow: /api/` is intentional — Googlebot does not need API endpoints; public data is served via SSR pages
- `Sitemap: https://open-scripts.shawnup.com/sitemap.xml`

## 3. sitemap.xml

```bash
curl -sI https://open-scripts.shawnup.com/sitemap.xml | head -3
curl -s https://open-scripts.shawnup.com/sitemap.xml | head -40
```

Must:
- Return `HTTP/2 200`
- Contain `<loc>https://open-scripts.shawnup.com/</loc>`
- Contain at least one `/read/` URL
- Contain at least one `/author/` URL
- Contain at least one `/org/` or `/series/` URL if data exists

## 4. Homepage SSR content

```bash
curl -sA "Googlebot" https://open-scripts.shawnup.com/ | grep -E '<title>|<meta name="description"|<link rel="canonical"|/read/'
```

Must:
- `<title>` present and non-empty
- `<meta name="description"` present
- `<link rel="canonical"` pointing to `https://open-scripts.shawnup.com/`
- At least one `/read/[id]` link in the initial HTML (not CSR-only)

Note: homepage `<h1>` is client-rendered (GalleryClient bails out of SSR due to `useSearchParams`). The initial HTML has `<h2>最新公開台本</h2>` from the SSR section. Do not flag missing `<h1>` in initial HTML as a pre-index blocker — `<title>`, `<meta description>`, canonical, and `/read/` links are the critical signals.

```bash
curl -sA "Googlebot" https://open-scripts.shawnup.com/ | grep -c '/read/'
```

Expected: ≥ 8 (from the SSR "最新公開台本" section rendered below the client gallery).

## 5. Read page

Pick any live script ID and run:

```bash
SCRIPT_ID=<id>
curl -sA "Googlebot" https://open-scripts.shawnup.com/read/$SCRIPT_ID \
  | grep -E '<title>|<meta name="description"|<link rel="canonical"|<h1|application/ld\+json'
```

Must:
- `<title>` contains the script title
- `<meta name="description"` present and non-empty
- `<link rel="canonical"` = `https://open-scripts.shawnup.com/read/$SCRIPT_ID`
- At least one `<h1>` with the script title
- `application/ld+json` block present (JSON-LD)

```bash
curl -sA "Googlebot" https://open-scripts.shawnup.com/read/$SCRIPT_ID \
  | python3 -c "import sys,json,re; body=sys.stdin.read(); blocks=re.findall(r'<script type=\"application/ld\+json\">(.*?)</script>', body, re.S); [print(json.dumps(json.loads(b), indent=2)) for b in blocks]"
```

Expected: valid JSON-LD with `@type` of `CreativeWork` (or subtype), `name`, `author`, `url`.

## 6. About page

```bash
curl -sA "Googlebot" https://open-scripts.shawnup.com/about \
  | grep -E '<title>|<meta name="description"|<link rel="canonical"|<h1'
```

Must: `<title>`, `<meta name="description">`, `<h1>` all present.

## 7. OG image

```bash
# Get OG image URL from homepage
OG_IMG=$(curl -s https://open-scripts.shawnup.com/ | grep -oP 'og:image" content="\K[^"]+' | head -1)
echo "$OG_IMG"
curl -sI "$OG_IMG" | head -5
```

Expected: `HTTP/2 200`, `content-type: image/png` (or jpeg/webp).

## 8. Cloudflare cache check

After deploy, verify Cloudflare is not serving a stale HTML with old `<title>` or missing `/read/` links:

```bash
curl -sI https://open-scripts.shawnup.com/ | grep -i 'cf-cache-status\|age:'
```

If `CF-Cache-Status: HIT` with a high `Age:`, purge via Cloudflare dashboard → Caching → Purge Everything, then re-check.

## 9. Lighthouse SEO (manual)

Run in Chrome DevTools → Lighthouse → SEO:

- Score must be 100
- No "links are not crawlable" warnings
- No "page is blocked from indexing" warnings

## Pass criteria summary

| Check | Command | Expected |
|---|---|---|
| favicon | `curl -sI .../favicon.ico` | 200 |
| robots.txt | `curl -s .../robots.txt` | Googlebot allowed, sitemap listed |
| sitemap.xml | `curl -sI .../sitemap.xml` | 200, contains /read/ URLs |
| homepage SSR links | `curl -sA Googlebot .../` grep `/read/` | ≥ 8 hits |
| read page title/canonical | `curl -sA Googlebot .../read/$ID` | title + canonical + JSON-LD |
| OG image | `curl -sI $OG_IMG` | 200 |
| Lighthouse SEO | DevTools | 100 |
