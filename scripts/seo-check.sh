#!/usr/bin/env bash
# seo-check.sh — Bot-perspective SEO + performance audit for open-scripts public site
#
# Checks (curl/fetch, no headless browser required):
#   - HTTP status + redirect chain
#   - Response time (TTFB)
#   - Key HTTP headers (cache, content-type, x-robots)
#   - <title>, <meta description>, <meta robots>, canonical <link>
#   - Open Graph tags (og:title, og:description, og:image, og:url)
#   - Twitter Card tags
#   - JSON-LD presence + @type
#   - H1 presence and count (SSR visibility check)
#   - Sitemap + robots.txt reachability
#   - Optional: Lighthouse CLI (if installed)
#
# Usage:
#   bash scripts/seo-check.sh [BASE_URL]
#   BASE_URL=https://open-scripts.shawnup.com bash scripts/seo-check.sh
#   bash scripts/seo-check.sh https://staging.example.com
#
# Bot UA: Googlebot — same UA used for crawl simulation

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-https://open-scripts.shawnup.com}}"
BASE_URL="${BASE_URL%/}"  # strip trailing slash

GOOGLEBOT_UA="Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
TIMEOUT=15

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; YELLOW='\033[1;33m'; GREEN='\033[0;32m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

pass()  { echo -e "  ${GREEN}✓${RESET} $*"; }
fail()  { echo -e "  ${RED}✗${RESET} $*"; FAIL_COUNT=$((FAIL_COUNT+1)); }
warn()  { echo -e "  ${YELLOW}~${RESET} $*"; WARN_COUNT=$((WARN_COUNT+1)); }
info()  { echo -e "  ${CYAN}·${RESET} $*"; }
header(){ echo -e "\n${BOLD}${CYAN}══ $* ${RESET}"; }

FAIL_COUNT=0
WARN_COUNT=0

# ── Fetch helper ──────────────────────────────────────────────────────────────
# fetch_page URL → prints HTML body; also sets:
#   HTTP_STATUS, RESPONSE_TIME_MS, REDIRECT_URL, CACHE_CONTROL, CONTENT_TYPE, X_ROBOTS
fetch_page() {
  local url="$1"
  local tmp_headers
  tmp_headers="$(mktemp)"

  local start_ns end_ns
  # macOS: gdate (from coreutils) or python fallback for nanoseconds
  if command -v gdate &>/dev/null; then
    start_ns=$(gdate +%s%N)
  else
    start_ns=$(python3 -c 'import time; print(int(time.time()*1000))')
  fi

  local body
  body=$(curl -sL \
    --max-time "$TIMEOUT" \
    --user-agent "$GOOGLEBOT_UA" \
    --dump-header "$tmp_headers" \
    --write-out "" \
    "$url" 2>/dev/null) || { HTTP_STATUS="ERR"; RESPONSE_TIME_MS=0; rm -f "$tmp_headers"; echo ""; return; }

  if command -v gdate &>/dev/null; then
    end_ns=$(gdate +%s%N)
    RESPONSE_TIME_MS=$(( (end_ns - start_ns) / 1000000 ))
  else
    end_ns=$(python3 -c 'import time; print(int(time.time()*1000))')
    RESPONSE_TIME_MS=$(( end_ns - start_ns ))
  fi

  # Parse status from first header line
  HTTP_STATUS=$(head -1 "$tmp_headers" | grep -oE '[0-9]{3}' | head -1 || echo "0")
  # If redirected, curl -L follows — grab last status
  HTTP_STATUS=$(grep -E '^HTTP/' "$tmp_headers" | tail -1 | grep -oE '[0-9]{3}' || echo "$HTTP_STATUS")

  CACHE_CONTROL=$(grep -i '^cache-control:' "$tmp_headers" | tail -1 | sed 's/^[^:]*: *//' | tr -d '\r' || echo "")
  CONTENT_TYPE=$(grep -i '^content-type:' "$tmp_headers" | tail -1 | sed 's/^[^:]*: *//' | tr -d '\r' || echo "")
  X_ROBOTS=$(grep -i '^x-robots-tag:' "$tmp_headers" | tail -1 | sed 's/^[^:]*: *//' | tr -d '\r' || echo "")

  rm -f "$tmp_headers"
  echo "$body"
}

# Extract first match of an HTML attribute or tag value
extract() {
  # extract PATTERN from HTML (stdin or arg2)
  local pattern="$1"
  local html="${2:-}"
  echo "$html" | grep -oiE "$pattern" | head -1 || echo ""
}

# ── Check one page ────────────────────────────────────────────────────────────
check_page() {
  local label="$1"
  local url="$2"
  local expected_jsonld_type="${3:-}"

  echo -e "\n${BOLD}▶ ${label}${RESET}"
  echo -e "  ${CYAN}${url}${RESET}"

  local html
  html=$(fetch_page "$url")

  # Status
  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "HTTP $HTTP_STATUS"
  elif [[ "$HTTP_STATUS" == "410" ]]; then
    pass "HTTP $HTTP_STATUS (retired/gone — correct)"
    return
  elif [[ "$HTTP_STATUS" =~ ^3 ]]; then
    warn "HTTP $HTTP_STATUS redirect"
  else
    fail "HTTP $HTTP_STATUS"
    [[ -z "$html" ]] && return
  fi

  # TTFB / response time
  if [[ $RESPONSE_TIME_MS -lt 800 ]]; then
    pass "TTFB ~${RESPONSE_TIME_MS}ms"
  elif [[ $RESPONSE_TIME_MS -lt 2000 ]]; then
    warn "TTFB ~${RESPONSE_TIME_MS}ms (slow)"
  else
    fail "TTFB ~${RESPONSE_TIME_MS}ms (very slow)"
  fi

  # Cache-Control
  if [[ -n "$CACHE_CONTROL" ]]; then
    info "Cache-Control: $CACHE_CONTROL"
  else
    warn "No Cache-Control header"
  fi

  # X-Robots-Tag
  if [[ -n "$X_ROBOTS" ]]; then
    if echo "$X_ROBOTS" | grep -qi "noindex"; then
      fail "X-Robots-Tag: $X_ROBOTS (noindex!)"
    else
      info "X-Robots-Tag: $X_ROBOTS"
    fi
  fi

  # Content-Type
  if echo "$CONTENT_TYPE" | grep -qi "text/html"; then
    pass "Content-Type: text/html"
  else
    warn "Content-Type: $CONTENT_TYPE"
  fi

  # ── HTML checks ──
  # <title>
  local title
  title=$(echo "$html" | grep -oiE '<title[^>]*>[^<]+</title>' | head -1 | sed 's/<[^>]*>//g' || echo "")
  if [[ -n "$title" ]]; then
    # Use byte length for threshold (CJK = 3 bytes/char; Google truncates ~60 display chars ≈ 180 bytes)
    local title_bytes title_chars
    title_bytes=$(echo -n "$title" | wc -c | tr -d ' ')
    title_chars=${#title}
    if [[ $title_bytes -gt 180 ]]; then
      warn "<title> may be too long (~${title_chars} chars / ${title_bytes} bytes): $title"
    elif [[ $title_bytes -lt 15 ]]; then
      warn "<title> too short (${title_chars} chars): $title"
    else
      pass "<title> (~${title_chars} chars): $title"
    fi
  else
    fail "<title> missing"
  fi

  # <meta description>
  local desc
  desc=$(echo "$html" | grep -oiE '<meta[^>]*name=["\x27]description["\x27][^>]*>' | head -1 || echo "")
  if [[ -z "$desc" ]]; then
    desc=$(echo "$html" | grep -oiE '<meta[^>]*name=description[^>]*>' | head -1 || echo "")
  fi
  if [[ -n "$desc" ]]; then
    local desc_content
    desc_content=$(echo "$desc" | grep -oiE 'content="[^"]*"' | head -1 | sed 's/content="//;s/"//' || echo "")
    local desc_bytes desc_chars
    desc_bytes=$(echo -n "$desc_content" | wc -c | tr -d ' ')
    desc_chars=${#desc_content}
    if [[ $desc_bytes -gt 480 ]]; then
      warn "<meta description> too long (~${desc_chars} chars / ${desc_bytes} bytes)"
    elif [[ $desc_bytes -lt 40 ]]; then
      warn "<meta description> short (~${desc_chars} chars): $desc_content"
    else
      pass "<meta description> (~${desc_chars} chars)"
    fi
  else
    fail "<meta description> missing"
  fi

  # <meta robots>
  local robots_meta
  robots_meta=$(echo "$html" | grep -oiE '<meta[^>]*name=["\x27]robots["\x27][^>]*>' | head -1 || echo "")
  if [[ -n "$robots_meta" ]]; then
    if echo "$robots_meta" | grep -qi "noindex"; then
      fail "<meta robots> noindex found: $robots_meta"
    else
      local robots_content
      robots_content=$(echo "$robots_meta" | grep -oiE 'content="[^"]*"' | sed 's/content="//;s/"//')
      pass "<meta robots>: $robots_content"
    fi
  else
    info "<meta robots> not set (defaults to index,follow)"
  fi

  # Canonical
  local canonical
  canonical=$(echo "$html" | grep -oiE '<link[^>]*rel=["\x27]canonical["\x27][^>]*>' | head -1 || echo "")
  if [[ -n "$canonical" ]]; then
    local canon_href
    canon_href=$(echo "$canonical" | grep -oiE 'href="[^"]*"' | sed 's/href="//;s/"//')
    pass "canonical: $canon_href"
  else
    warn "canonical <link> missing"
  fi

  # ── Open Graph ──
  local og_title og_desc og_image og_url og_type
  og_title=$(echo "$html" | grep -oiE '<meta[^>]*property=["\x27]og:title["\x27][^>]*>' | head -1 | grep -oiE 'content="[^"]*"' | sed 's/content="//;s/"//' || echo "")
  og_desc=$(echo "$html" | grep -oiE '<meta[^>]*property=["\x27]og:description["\x27][^>]*>' | head -1 | grep -oiE 'content="[^"]*"' | sed 's/content="//;s/"//' || echo "")
  og_image=$(echo "$html" | grep -oiE '<meta[^>]*property=["\x27]og:image["\x27][^>]*>' | head -1 | grep -oiE 'content="[^"]*"' | sed 's/content="//;s/"//' || echo "")
  og_url=$(echo "$html" | grep -oiE '<meta[^>]*property=["\x27]og:url["\x27][^>]*>' | head -1 | grep -oiE 'content="[^"]*"' | sed 's/content="//;s/"//' || echo "")

  [[ -n "$og_title" ]] && pass "og:title: $og_title" || fail "og:title missing"
  [[ -n "$og_desc" ]]  && pass "og:description present" || warn "og:description missing"
  if [[ -n "$og_image" ]]; then
    pass "og:image: $og_image"
    # Verify image reachable
    local img_status
    img_status=$(curl -sI --max-time 8 --user-agent "$GOOGLEBOT_UA" "$og_image" 2>/dev/null | head -1 | grep -oE '[0-9]{3}' | head -1 || echo "ERR")
    [[ "$img_status" == "200" ]] && pass "og:image reachable (HTTP $img_status)" || warn "og:image HTTP $img_status: $og_image"
  else
    warn "og:image missing"
  fi
  [[ -n "$og_url" ]] && pass "og:url: $og_url" || warn "og:url missing"

  # ── Twitter Card ──
  local tw_card
  tw_card=$(echo "$html" | grep -oiE '<meta[^>]*name=["\x27]twitter:card["\x27][^>]*>' | head -1 | grep -oiE 'content="[^"]*"' | sed 's/content="//;s/"//' || echo "")
  [[ -n "$tw_card" ]] && pass "twitter:card: $tw_card" || warn "twitter:card missing"

  # ── H1 count (SSR visibility — critical for client-component pages) ──
  local h1_count
  h1_count=$(echo "$html" | grep -oiE '<h1[^>]*>' | wc -l | tr -d ' ')
  if [[ "$h1_count" -eq 1 ]]; then
    pass "H1 count: 1"
    local h1_text
    h1_text=$(echo "$html" | grep -oiE '<h1[^>]*>[^<]*' | head -1 | sed 's/<[^>]*>//')
    info "H1 text: $h1_text"
  elif [[ "$h1_count" -eq 0 ]]; then
    fail "H1 missing (SSR not rendering H1 — client-only?)"
  else
    warn "Multiple H1 tags ($h1_count) — may confuse crawlers"
  fi

  # ── JSON-LD ──
  local jsonld_blocks
  jsonld_blocks=$(echo "$html" | grep -oiE '<script[^>]*type=["\x27]application/ld\+json["\x27][^>]*>.*?</script>' || \
    echo "$html" | python3 -c "
import sys, re
html = sys.stdin.read()
blocks = re.findall(r'<script[^>]*type=[\"\\']application/ld\+json[\"\\'][^>]*>(.*?)</script>', html, re.DOTALL|re.IGNORECASE)
for b in blocks: print(b.strip())
" 2>/dev/null || echo "")

  if [[ -n "$jsonld_blocks" ]]; then
    local jsonld_types
    jsonld_types=$(echo "$jsonld_blocks" | grep -oiE '"@type"\s*:\s*"[^"]*"' | sed 's/.*"\([^"]*\)"/\1/' | tr '\n' ',' | sed 's/,$//' || echo "unknown")
    pass "JSON-LD present (@type: $jsonld_types)"

    if [[ -n "$expected_jsonld_type" ]]; then
      if echo "$jsonld_types" | grep -qi "$expected_jsonld_type"; then
        pass "JSON-LD @type includes expected: $expected_jsonld_type"
      else
        warn "JSON-LD @type '$jsonld_types' — expected '$expected_jsonld_type'"
      fi
    fi

    # Validate JSON syntax via python (if available)
    echo "$html" | python3 -c "
import sys, re, json
html = sys.stdin.read()
blocks = re.findall(r'<script[^>]*type=[\"\\']application/ld\+json[\"\\'][^>]*>(.*?)</script>', html, re.DOTALL|re.IGNORECASE)
errors = []
for i, b in enumerate(blocks):
    try: json.loads(b)
    except Exception as e: errors.append(f'Block {i+1}: {e}')
if errors:
    for e in errors: print('JSON-LD INVALID: ' + e)
else:
    print('JSON-LD syntax valid (' + str(len(blocks)) + ' block(s))')
" 2>/dev/null | while IFS= read -r line; do
      if echo "$line" | grep -qi "INVALID"; then
        fail "$line"
      else
        pass "$line"
      fi
    done
  else
    warn "JSON-LD missing"
  fi
}

# ── Check infrastructure ──────────────────────────────────────────────────────
check_infra() {
  header "Infrastructure"

  # robots.txt
  echo -e "\n${BOLD}▶ robots.txt${RESET}"
  local robots_body robots_status
  HTTP_STATUS="0"
  robots_body=$(fetch_page "${BASE_URL}/robots.txt")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "robots.txt reachable"
    if echo "$robots_body" | grep -qi "sitemap"; then
      local sitemap_line
      sitemap_line=$(echo "$robots_body" | grep -i "sitemap" | head -1)
      pass "Sitemap declared: $sitemap_line"
    else
      warn "No Sitemap: line in robots.txt"
    fi
    if echo "$robots_body" | grep -qiE "^Disallow: /$"; then
      fail "robots.txt disallows all — Disallow: /"
    else
      pass "No blanket Disallow: /"
    fi
    info "robots.txt content:"
    echo "$robots_body" | head -20 | while IFS= read -r line; do
      echo "    $line"
    done
  else
    fail "robots.txt HTTP $HTTP_STATUS"
  fi

  # sitemap.xml
  echo -e "\n${BOLD}▶ sitemap.xml${RESET}"
  HTTP_STATUS="0"
  local sitemap_body
  sitemap_body=$(fetch_page "${BASE_URL}/sitemap.xml")
  if [[ "$HTTP_STATUS" == "200" ]]; then
    pass "sitemap.xml reachable (HTTP 200)"
    local url_count
    url_count=$(echo "$sitemap_body" | grep -oiE '<url>' | wc -l | tr -d ' ')
    if [[ "$url_count" -gt 0 ]]; then
      pass "sitemap.xml contains $url_count <url> entries"
    else
      warn "sitemap.xml has 0 <url> entries (dynamic routes not loaded yet?)"
    fi
    if echo "$sitemap_body" | grep -qiE '<urlset|<sitemapindex'; then
      pass "Valid XML sitemap structure"
    else
      warn "sitemap.xml may not be valid XML sitemap"
    fi
  else
    fail "sitemap.xml HTTP $HTTP_STATUS"
  fi

  # /gallery redirect → 410
  echo -e "\n${BOLD}▶ /gallery (retired route)${RESET}"
  HTTP_STATUS="0"
  fetch_page "${BASE_URL}/gallery" >/dev/null
  if [[ "$HTTP_STATUS" == "410" ]]; then
    pass "/gallery returns 410 Gone (correct)"
  elif [[ "$HTTP_STATUS" == "301" || "$HTTP_STATUS" == "302" ]]; then
    warn "/gallery redirects ($HTTP_STATUS) — expected 410"
  else
    warn "/gallery HTTP $HTTP_STATUS (expected 410)"
  fi
}

# ── Lighthouse (optional) ─────────────────────────────────────────────────────
run_lighthouse() {
  local url="$1"
  local label="$2"

  if ! command -v lighthouse &>/dev/null; then
    return
  fi

  echo -e "\n${BOLD}▶ Lighthouse: $label${RESET}"
  local report
  report=$(lighthouse "$url" \
    --quiet \
    --chrome-flags="--headless --no-sandbox" \
    --only-categories=performance,seo,accessibility,best-practices \
    --output=json 2>/dev/null) || { warn "Lighthouse failed for $url"; return; }

  local perf seo acc bp
  perf=$(echo "$report" | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['categories']['performance']['score']*100))" 2>/dev/null || echo "?")
  seo=$(echo "$report"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['categories']['seo']['score']*100))" 2>/dev/null || echo "?")
  acc=$(echo "$report"  | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['categories']['accessibility']['score']*100))" 2>/dev/null || echo "?")
  bp=$(echo "$report"   | python3 -c "import sys,json; d=json.load(sys.stdin); print(int(d['categories']['best-practices']['score']*100))" 2>/dev/null || echo "?")

  score_line() {
    local name="$1" score="$2"
    if [[ "$score" == "?" ]]; then warn "$name: ?"; return; fi
    if [[ "$score" -ge 90 ]]; then pass "$name: $score"
    elif [[ "$score" -ge 70 ]]; then warn "$name: $score"
    else fail "$name: $score"; fi
  }

  score_line "Performance" "$perf"
  score_line "SEO" "$seo"
  score_line "Accessibility" "$acc"
  score_line "Best Practices" "$bp"
}

# ══════════════════════════════════════════════════════════════════════════════

echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║   SEO + Bot Crawl Audit — open-scripts       ║"
echo "╚══════════════════════════════════════════════╝${RESET}"
echo -e "  Target: ${CYAN}${BASE_URL}${RESET}"
echo -e "  UA:     Googlebot"
echo -e "  Time:   $(date '+%Y-%m-%d %H:%M:%S')"

# Infrastructure checks
check_infra

# ── Page checks ──────────────────────────────────────────────────────────────
header "Static Pages"
check_page "Homepage (/)"          "${BASE_URL}/"          "WebSite"
check_page "About (/about)"        "${BASE_URL}/about"     ""
check_page "Help (/help)"          "${BASE_URL}/help"      ""
check_page "License (/license)"    "${BASE_URL}/license"   ""
check_page "Privacy (/privacy)"    "${BASE_URL}/privacy"   ""
check_page "Terms (/terms)"        "${BASE_URL}/terms"     ""

# ── Dynamic page sample — fetch one real script ID from sitemap ──
header "Dynamic Page Sample"
SAMPLE_READ_URL=""
HTTP_STATUS="0"
sitemap_sample=$(fetch_page "${BASE_URL}/sitemap.xml" 2>/dev/null || echo "")
if [[ -n "$sitemap_sample" ]]; then
  # Extract first /read/ URL from sitemap
  SAMPLE_READ_URL=$(echo "$sitemap_sample" | grep -oE "${BASE_URL}/read/[^<]+" | head -1 || echo "")
fi

if [[ -n "$SAMPLE_READ_URL" ]]; then
  check_page "Read page (sample)" "$SAMPLE_READ_URL" "CreativeWork"
  run_lighthouse "$SAMPLE_READ_URL" "Read page"
else
  warn "No /read/ URL found in sitemap — skipping dynamic page check"
fi

# Lighthouse on homepage
run_lighthouse "${BASE_URL}/" "Homepage"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══ Summary ══${RESET}"
if [[ $FAIL_COUNT -eq 0 && $WARN_COUNT -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}All checks passed!${RESET}"
elif [[ $FAIL_COUNT -eq 0 ]]; then
  echo -e "  ${YELLOW}${BOLD}${WARN_COUNT} warning(s), 0 failures${RESET}"
else
  echo -e "  ${RED}${BOLD}${FAIL_COUNT} failure(s)${RESET}, ${YELLOW}${WARN_COUNT} warning(s)${RESET}"
fi
echo ""

[[ $FAIL_COUNT -gt 0 ]] && exit 1 || exit 0
