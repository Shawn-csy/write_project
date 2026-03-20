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
- 參考：`src/lib/safeHtml.js`, `server/services/seo.py`

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
