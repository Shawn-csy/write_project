# Security Protection Guide

最後更新：2026-03-19

## 1) 目的與範圍
本文件說明目前網站（frontend + backend）已落地的資安防護、已知風險邊界、以及後續硬化步驟。

## 2) 目前已啟用的防護

### 2.1 身分驗證與授權
- 後端 API 以 Firebase Bearer Token 驗證為主。
- `X-User-ID` fallback 僅在明確非 production 環境允許，production 強制關閉。
- 參考：`server/dependencies.py`

### 2.2 CORS 與來源控管
- 採白名單 `allow_origins`，非萬用 `*`。
- `connect-src` 已改為從白名單來源組裝，不允許 `connect-src https:` 萬用。
- 參考：`server/main.py`

### 2.3 HTTP 安全標頭
已設定：
- `Content-Security-Policy`
- `Content-Security-Policy-Report-Only`
- `Cross-Origin-Opener-Policy: same-origin-allow-popups`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

CSP 現況：
- Enforced：`script-src 'self'`（已移除 `unsafe-inline`）
- Enforced：`style-src 'self' 'unsafe-inline'`（相容保留）
- Report-Only：`style-src 'self'`（用於觀測收斂）
- 參考：`server/main.py`

### 2.4 XSS / 輸出安全
- 前端有安全 HTML 渲染策略（白名單清洗）。
- SEO JSON-LD 注入時，已對 `< > &` 做 escaping，避免 `</script>` break-out。
- 參考：`src/lib/safeHtml.ts`, `server/services/seo.py`

### 2.5 上傳與檔案處理
- 媒體上傳限制圖片型別，並做簽章驗證與路徑隔離。
- 參考：`server/routers/media.py`

### 2.6 Rate Limit
- 透過 `slowapi` + IP key（支援 `cf-connecting-ip` / `x-forwarded-for`）
- 目前已套用的重點路由：
  - `/api/export/all`: `5/minute`
  - `/api/search`: `60/minute`
- 參考：`server/rate_limit.py`, `server/routers/scripts.py`

### 2.7 敏感資訊管理
- `.env`, `.env.dev`, `server/secrets/firebase-service-account.json` 已被 `.gitignore` 忽略，不應進版控。

## 3) 近期硬化變更（2026-03-19）
- CSP 收斂：移除 Enforced `script-src 'unsafe-inline'`
- 移除 SEO dev redirect 內嵌 JS（`window.location.replace(...)`）
- `connect-src` 改為來源白名單，不再用 `https:` 萬用
- `Referrer-Policy` 強化為 `strict-origin-when-cross-origin`
- 新增 / 強化對應測試斷言

## 4) 測試與驗證
建議最少執行：

```bash
cd server && PYTHONPATH=. ../server/venv/bin/pytest \
  tests/test_seo.py \
  tests/test_security.py \
  tests/test_rate_limit.py \
  tests/test_dependencies.py \
  tests/test_public_api.py \
  tests/test_public_api_advanced.py \
  tests/test_public_bundle_api.py
```

目前最近一次結果：`39 passed`。

## 5) 已知風險邊界
- Enforced CSP 仍保留 `style-src 'unsafe-inline'`（為相容性暫留）。
- Dynamic / 外部層（CDN、Nginx、雲端 WAF）行為需在 staging / production 另行驗證。

## 6) 下一步建議（優先順序）
1. 觀察 `Content-Security-Policy-Report-Only` 的 style 違規事件。
2. 將 inline style 逐步改為 class / nonce / hash 可控方案。
3. 在無回歸後，移除 Enforced `style-src 'unsafe-inline'`。
4. 定期跑依賴漏洞掃描與安全測試（CI gate）。

## 7) 維護守則
- 新增任何第三方 script/style 前，先評估是否破壞 CSP 收斂路線。
- 非 production 環境功能（如 fallback auth）不得帶入 production。
- 涉及公開 API 的變更，需附帶 rate limit 與權限檢查。

## 8) 公開站來源入口保護（2026-11-10）

目前公開站的 Nginx 入口只發布於 IPv4／IPv6 loopback，由 Cloudflare Tunnel 連入；`scripts/check-prod-network-boundary.py` 驗證公開埠邊界。Nginx 依 Cloudflare 提供的 `CF-Connecting-IP` 對寫入方法共用每來源 10 r/s、burst 24、最多 8 個同時連線；無該標頭時使用連入位址。後端公開寫入路由另有自身的速率與內容驗證。

動態頁、公開 bundle／身份 API 與公開媒體代理的 GET／HEAD，另共用每來源 20 r/s、burst 40、最多 12 個同時連線。查詢字串不進入限流鍵，避免以不同參數規避額度；靜態資源與健康檢查不使用讀取額度。兩個預算各自獨立，超量回 429。這些限制保護單一來源造成的過載，無法單獨抵擋分散式攻擊；仍需 Cloudflare 邊緣層與來源站監控配合。

在隔離候選入口執行 `scripts/check-ingress-read-limits.py` 與 `scripts/check-ingress-write-limits.py`。讀取測試交錯對首頁與 bundle API 發出 80 個同來源請求，兩種路徑都出現 429，另一來源、圖示及健康檢查仍可回 200；三秒後原來源恢復。正常瀏覽器載入首頁、作者與聲演頁九次，均無 429 或資源錯誤。`scripts/security-check.sh` 的後端 99 項、前端 66 項回歸測試通過。正式切流後主要頁面、readiness 與公開網址均回 200。

## 9) HTML／RSC 快取邊界（2026-11-10）

Next.js 同一頁面 URL 會依 `RSC` 請求標頭回傳 HTML 或 `text/x-component`。Cloudflare 的實際快取鍵未區分此標頭：用獨立查詢字串先請求 RSC，再請求一般 HTML，第二次得到快取的 RSC 內容。首頁原本的公開 `Cache-Control` 同時套用在兩種回應，也套用在 `_rsc` 參數正規化的 307 轉址。台本等 ISR 頁面亦有同樣問題，且 RSC 原本可被快取 3600 秒。

`apps/public/next.config.ts` 現在只對沒有 `RSC` 標頭的首頁請求套用 120 秒公開快取；所有帶 `RSC` 標頭的 Next.js 回應明確回 `private, no-store`，包含 200 資料回應與首頁 307 轉址。頁面 HTML 仍沿用各自的快取政策。`scripts/check-rsc-cache-boundary.py --sample-sitemap` 在隔離候選入口抽樣各類頁面；本次實跑涵蓋首頁與另外六頁，`securityHeaders.test.ts` 防止路由條件退化。正式切流後，以全新查詢字串測試 Cloudflare：首頁、台本與說明頁連續兩次 RSC 回應均為 `BYPASS`，同網址的一般請求為 HTML／`MISS`；作者頁 RSC 為 `DYNAMIC` 且回 `private, no-store`。首頁 RSC 307 亦為 `BYPASS`。這項修正防止回應類型混淆，沒有停用頁面 HTML 的邊緣快取。

新標頭不會主動清除發布前已存入的舊快取。台本頁原有 `s-maxage=3600, stale-while-revalidate=3600`，舊項目可能在過期與重新驗證前繼續出現；目前工作環境沒有可用的 Cloudflare Cache Purge token，且整個 zone 的清除會影響其他服務，因此未執行全域 purge。新查詢與未命中的請求均已驗證使用修正後政策。
