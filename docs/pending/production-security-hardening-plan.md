# Production Security Hardening Plan

最後更新：2026-11-10

## 目的

本文件整理目前公開網站與後端部署架構中已確認的資安風險，並定義長期、系統性、可驗收的改善路線。

這不是功能開發文件，也不是短期補丁清單。目標是把正式環境的攻擊面、公開寫入 API、防濫用、快取重建權限、外部媒體來源與依賴漏洞治理成一套穩定的安全基線。

## 範圍

包含：

- `docker-compose.prod.yml`
- `nginx.conf`
- FastAPI backend public/private API 邊界
- Next.js public BFF / revalidation route
- 公開寫入 API：view、like、terms acceptance、訪客投稿與聲演資料補充
- 公開媒體與外部圖片來源策略
- production dependency audit
- security documentation / regression tests

不包含：

- 產品權限模型重設計；
- Firebase provider 更換；
- 非 production local dev 便利功能；
- 手動雲端防火牆設定本身，但本文件會要求程式碼層不要依賴防火牆補救。

## 已確認問題

| 優先級 | 問題 | 狀態 | 核心風險 |
|---|---|---|---|
| P0 | Postgres port 對外 publish 且有弱預設密碼 | 已修正並驗證實際容器無 host port | DB 可能直接暴露到 host network |
| P0 | Backend API port 對外 publish，繞過 nginx | 已修正並驗證實際容器無 host port | 攻擊者可直接打 backend，繞過 ingress policy |
| P1 | 公開寫入 API 無足夠 rate limit | 已部署後端與入口限制，仍需持續攻擊測試 | DB bloat、view/like 刷數、terms acceptance 濫用 |
| P1 | API 寫入先解析過大的 JSON body | 已部署預設與路由大小上限、回歸測試 | 無需大量請求就可增加解析記憶體與 CPU 負擔 |
| P1 | like 去重依賴 client-controlled `visitorId` | 已部署來源 IP 約束，仍需持續攻擊測試 | 攻擊者可偽造 visitorId 造成互動數據失真 |
| P1 | Next 圖片最佳化器允許私有 IP 並跟隨外部重新導向 | 已部署，需持續回歸測試 | 受允許的外部圖片來源若重新導向到內網，可能讓伺服器代為請求 |
| P2 | `/api/revalidate` path 無白名單、無數量與長度上限 | 已部署路徑與數量限制 | secret 洩漏後可 DoS ISR cache / 重渲染 |
| P2 | production dependency audit 有 high/critical 項目 | 目前 `npm audit --omit=dev` 為 0 項 | 供應鏈風險與已知 CVE |
| P2 | Python 後端相依上限阻止安全更新 | 已將 `cryptography` 升至 50.0.2，映像稽核 0 項；CI 加入 `pip-audit --strict` | 舊映像含已知漏洞且原 `<45` 上限無法取得修復版 |
| P3 | 外部圖片 fallback 到 browser `<img>` | 保留並設定 `no-referrer` | 非 SSRF，但會讓訪客向第三方來源發請求 |

## 風險細節

### P1 — 圖片最佳化器的內網請求邊界

工作區原先設 `images.dangerouslyAllowLocalIP: true`，並允許外部圖片 host 使用 `next/image`。Next.js [圖片文件](https://nextjs.org/docs/app/api-reference/components/image#remotepatterns) 說明重新導向後不會重新檢查 `remotePatterns`；允許私有 IP 會擴大 SSRF 風險。現在工作區移除 Docker backend 的 optimizer 來源、設 `dangerouslyAllowLocalIP: false`、`maximumRedirects: 0`，並將來源大小上限設為 12 MiB。站內 `/media/` 仍走已有的受限代理。

本機候選服務驗證：直接要求最佳化器抓取 `127.0.0.1` 回 400，站內圖片最佳化與 `/media/` 代理回 200；作者、社團頁沒有圖片請求錯誤。新版公開站與 backend 已於 2026-11-10 協調發布；正式來源站再測 `127.0.0.1` 與 `169.254.169.254` 的最佳化請求均回 400，未知路徑回 404。早期候選服務的兩張外部封面 404 是舊 backend 缺少新的單筆封面查詢路由，不能以單獨切換公開站處理。

### P0 — Postgres 不應對外 publish

現況：

```yaml
write_project-postgres:
  environment:
    - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-write_project}
  ports:
    - "${POSTGRES_PORT:-1092}:5432"
```

問題：

- Docker publish port 會把 Postgres 綁到 host。
- 預設密碼 `write_project` 不應存在於 production fallback。
- 不能把安全性建立在「host firewall 應該有擋」這個假設上。

長期方向：

- production compose 不 publish Postgres；
- DB 只存在 compose internal network；
- `POSTGRES_PASSWORD` / `DATABASE_URL` 必須顯式提供，缺失時 fail fast；
- 如需維運連線，使用 SSH tunnel / docker exec / private network，不開 public port。

### P0 — Backend 不應對外 publish

現況：

```yaml
write_project-backend:
  ports:
    - "1091:1091"
```

問題：

- nginx 已經是公開 ingress，但 backend 仍可被直接打到。
- 直接 backend 會繞過 nginx route boundary、未來 WAF、edge rate limit、route-specific policy。
- FastAPI docs/openapi、raw backend endpoints、未來新增路由都會增加攻擊面。

長期方向：

- production compose 不 publish backend port；
- backend 僅 expose 給 nginx container；
- 若 local/staging 需要直接打 backend，使用 override compose，不放在 production compose；
- backend 仍需保留自身 auth/rate limit，不能只依賴 nginx。

### P1 — 公開寫入 API 需要防濫用

2026-11-10 補強：公開回饋、Demo／音聲投稿、外部作者與聲演資料補充、聲演認領、我的 Demo 修改，以及公開 view／like 已在 FastAPI JSON 解析前按路由限制 body。Nginx 對上述表單與互動路由另設 128 KiB／4 KiB 入口上限，terms acceptance 維持 4 KiB；媒體上傳維持 12 MiB 額度。`scripts/security-check.sh` 納入一般與串流超限、正常小型回饋與未受表單上限約束的私人台本路由測試。候選與正式入口均驗證超限回 413，健康檢查及公開頁回 200；正式站只在 `127.0.0.1:1090` 和 `[::1]:1090` 發布。

同日再將上限擴為整個 `/api/` 寫入邊界：FastAPI 對 POST／PUT／PATCH 預設 1 MiB，Nginx 一般 `/api/` 入口也設 1 MiB。長篇台本、文件匯出、媒體上傳維持 12 MiB；外部台本的封面資料可用 4 MiB；較小的公開表單與互動路由仍以原有精細上限為準。後端測試含未來新增 API 路由、串流超限與超過 1 MiB 的真實台本儲存；完整後端 405 項與資安回歸 99／66 項通過。候選及正式入口以無效大內容驗證一般路由 413、例外路由進入原有驗證流程，沒有寫入正式資料。`api-default-limit-20261110` 已上線，主要頁面及 readiness 回 200，其他服務未重啟。

`api-ingress-guard-v2-20261110` 在 Nginx 共用入口對 POST／PUT／PATCH／DELETE 依來源 IP 設每秒 10 次、突發 24 次及同時 8 條連線的上限，超出回 429；GET 不佔此額度。這在較大的已驗證路由到達後端前限制單一來源的突發與慢速併發，但不取代 Firebase 權限驗證，也不保證能阻止分散來源攻擊。隔離入口以 `scripts/check-ingress-write-limits.py` 對一般 API、台本與公開表單各送 50 個無效寫入請求，三者均觸發 429；50 個讀取請求全數成功，額度恢復後寫入再次進入原有驗證，8 條未完成寫入時第 9 條回 429。既有 1／4／12 MiB 大小界線、99／66 項資安回歸與網站專用切流檢查通過。正式入口主要頁面、readiness 及 Nginx 語法均正常，僅保留直接回滾版的本站 API／公開站運作。

確認路由：

- `POST /api/scripts/{script_id}/view`
- `POST /api/public-scripts/{script_id}/like`
- `POST /api/public-terms-acceptances`

問題：

- view 可以被任意重複打；
- like 的 `visitorId` 由 client localStorage 產生，可偽造；
- terms acceptance 寫入稽核資料，缺 rate limit 容易造成 DB 膨脹。

長期方向：

- 所有 unauthenticated write endpoints 都必須有 rate limit；
- view 使用 `ip + script_id` 或 `visitorId + script_id` 的短時間窗口去重；
- like 不把 client `visitorId` 當唯一可信識別，至少加入 IP / UA / script scoped throttling；
- terms acceptance 限制 body 大小、欄位長度、每 IP 每 script 每版本寫入頻率；
- 後端測試覆蓋濫用情境。

### P2 — Revalidate route 需要縮小權限

現況：

```ts
if (typeof path === "string" && path.startsWith("/")) {
  revalidatePath(path);
}
```

問題：

- secret 保護存在，但 path 權限過大；
- 無 `paths.length` 上限；
- 無單條 path 長度限制；
- secret 洩漏時可大量 revalidate 任意路徑，造成 Next render 壓力。

長期方向：

- 只允許公開頁路徑：
  - `/`
  - `/read/{id}`
  - `/author/{id}`
  - `/org/{id}`
  - `/series/{name}`
  - `/tag/{name}`
  - `/sitemap.xml`
- 限制每次最多 revalidate N 條；
- 限制 path 長度；
- 拒絕 `//`、`\`、控制字元、query string、fragment；
- 寫測試鎖住合法/非法案例。

### P2 — Dependency audit 要變成固定流程

目前 `npm audit --omit=dev` 回報 high/critical，其中包括：

- `protobufjs`
- `@grpc/grpc-js`
- `react-router`
- `xlsx`
- `tmp`

補充：

- `apps/public/package.json` 的 package name 是 `public`，會造成 `public` 套件弱點誤報；
- 這需要改名，避免 audit noise 掩蓋真問題。

長期方向：

- 改名 `apps/public` package，例如 `@write/public-app`；
- 升級或 override 可修的 transitive dependency；
- 對無 upstream fix 的套件建立 replacement plan；
- CI 加入 production dependency audit，但允許有文件化 exception。

### P3 — 外部圖片來源策略

現況：

- allowlist host 走 `next/image`；
-未知外部 URL fallback 到 browser `<img>`。

這不是 SSRF，因為未知外部 URL 不經過 Next optimizer server。但仍有：

- 訪客 IP 暴露給第三方圖片 host；
- Referer / User-Agent 暴露；
- 第三方慢速圖片影響 UX；
- 創作者可把追蹤像素放進公開頁。

長期方向：

- 在儲存階段做媒體來源政策；
- public page 對未知 host 顯示 placeholder 或明確標示外部來源；
- 若保留外部圖片，建立 allowlist / review flow；
- 對第三方圖片設定 `referrerPolicy`，並評估 `loading` / timeout fallback。

## 改善階段

### Phase 1 — Production Compose Boundary

任務：

- 移除 production compose 的 Postgres `ports`。
- 移除 production compose 的 backend `ports`。
- 將需要直接連線的 dev/staging port publish 移到 override compose。
- 將 DB 密碼 fallback 改成必填；缺少時啟動失敗。
- 更新 deployment docs。

驗收：

- [x] `docker-compose.prod.yml` 只對外 publish nginx。
- [x] Postgres 只在 internal network 可達。
- [x] Backend 只被 nginx / public Next container 內部呼叫。
- [x] production 未提供 DB secret 時 fail fast（`${POSTGRES_PASSWORD:?...}`）。
- [x] 待部署 Compose 的 Nginx 僅綁 `127.0.0.1:1090` 與 `[::1]:1090`；`scripts/check-prod-network-boundary.py` 在安全測試、CI 與部署前檢查此界線。Tunnel 實際曾透過 `::1:1090` 連入。
- [x] 網站專用切流後，實際 `wp-prod-live-edge` 僅綁 `127.0.0.1:1090` 與 `[::1]:1090`；公開入口與雙 loopback `/healthz` 均回 200。舊容器仍保留但已停止，其他服務未重啟。

### Phase 2 — Public Write Rate Limits

任務：

- 為 view / like / terms acceptance 加 explicit limiter。
- 建立 `public_write_key_func`，支援 `cf-connecting-ip` / `x-forwarded-for` / client fallback。
- view 加短時間去重策略。
- like 加 server-side abuse guard，不只依賴 visitorId。
- terms acceptance 加欄位長度與 body 限制。

實作狀態：

- view / like / terms acceptance 均已加 `@limiter.limit()` decorator（slowapi，X-Forwarded-For key）。
- Private script view 已加 visibility gate（404）；folder-inherited 可見性統一走 `is_publicly_visible()`。
- 目前 Phase 2 的 abuse guard 策略：per-IP rate limit 作為主要防線。
- view 已用資料庫唯一鍵與到期時間，對同來源 IP、同作品做 10 分鐘去重；內部與外部公開作品共用同一機制。成功計數時順手清除一筆到期紀錄。
- like 保留 visitorId 的按／取消語意；匿名新增另由資料庫鎖定作品列，限制同來源 IP 對同作品最多 3 筆有效讚。來源以 HMAC 摘要儲存，正式環境使用 `PUBLIC_ENGAGEMENT_SECRET` 或既有 `REVALIDATE_SECRET`；舊讚沒有來源資料，無法回填。
- terms acceptance 已有 4 KiB ASGI body 限制（包含無 `Content-Length` 的串流請求）、Nginx 同路徑限制、Pydantic 欄位界線與入庫標頭長度限制。

驗收：

- [x] 同 IP 快速重複 view 不會無限制增加 counter（rate limit 10/minute per IP）。
- [x] 偽造大量 visitorId 無法讓同來源 IP 對同作品累積超過 3 筆新讚；每 IP 仍有 30/minute 限流。
- [x] terms acceptance 大量寫入會被 429（rate limit 5/minute per IP）。
- [x] 對應 pytest 覆蓋（decorator presence + 429 integration tests）。
- [x] view 短時間窗口去重（同 IP + script_id，避免一次 request 衝破 counter）。
- [x] terms acceptance 欄位長度與 body size 限制。

### Phase 3 — Revalidate Scope Lockdown

任務：

- 新增 `validateRevalidatePath(path)` pure helper。
- 限制 path pattern、長度、數量。
- 對非法路徑回傳 400，不 silently ignore。
- 保留 secret 檢查。

驗收：

- [x] 合法公開路徑可 revalidate。
- [x] `/api/*`、`//evil`、帶 query/hash、超長 path 被拒絕（400 + `rejected` array）。
- [x] 一次 payload 超過上限被拒絕（`MAX_PATHS=50`）。
- [x] route handler tests 覆蓋（`route.test.ts` 4 tests）。

### Phase 4 — Dependency Security Baseline

任務：

- `apps/public/package.json` 改名，移除 `public` package audit false positive。
- 跑 `npm audit --omit=dev` 並分類：
  - fix now；
  - override；
  - accepted risk；
  - replace package。
- 優先處理 `protobufjs`、`@grpc/grpc-js`、`react-router`。
- 評估 `xlsx` 替代方案或隔離使用面。

驗收：

- [x] audit false positive 消失（`apps/public` 改名 `@write/public-app`）。
- [x] high/critical 有修復或文件化 exception（見 `docs/engineering/dependency-audit.md`；`npm audit --omit=dev` 0 high / 0 critical）。
- [x] lockfile 更新可重現。

### Phase 5 — External Media Origin Policy

任務：

- 定義 public media origin policy。
- 在 save/metadata layer 驗證 URL。
- `PublicImage` 對未知 external host 的行為明確化：
  - placeholder；
  - allowlist fallback；
  - 或保留 `<img>` 但加 `referrerPolicy`。
- 補測試。

驗收：

- [x] 未知外部圖片不走 Next.js optimizer（不產生 SSRF proxy）。未知 host 走 `<img>` fallback with `referrerPolicy="no-referrer"`，不送 Referer 給第三方。
- [x] allowlist 行為有單元測試（`publicImageOrigins.test.ts` 4 個測試）。
- [x] UI 有合理 fallback（`<img>` 直接渲染，非靜默失敗）。
- [x] `PublicImage.test.tsx` 補 `referrerpolicy="no-referrer"` assertion，鎖住 fallback contract。
- [x] 外部台本的 metadata 抓取在每次連線固定使用已驗證的公開 IP，轉址重新驗證；儲存時拒絕 localhost、私有 IP、內部網域與含憑證的 URL。

### Phase 6 — Security Regression Suite

任務：

- 建立固定 security test command。
- 將 deployment boundary 檢查加入文件或 script。
- 加入 API abuse tests。
- 加入 revalidate validation tests。

Security test command：

```bash
bash scripts/security-check.sh
```

涵蓋範圍：
- 後端公開寫入、同意紀錄、可信來源 IP、外部 metadata 抓取與 URL 驗證測試。
- 前端 revalidate 範圍、遠端圖片代理及按讚失敗回滾測試。

新增 public write endpoint 規定：必須同時在 `test_public_write_hardening.py` 加入：
1. decorator presence test（`test_*_has_rate_limit_decorator`）
2. visibility gate test（private → 404, public → 200）
3. 429 integration test（`@requires_rate_limit`）

驗收：

- [x] local security test command 文件化（`bash scripts/security-check.sh`）。
- [x] 最小安全測試集合可由 CI 呼叫（script 含 backend + frontend security tests；CI wiring 另行接入）。
- [x] 新增 public write endpoint 時需附 rate limit 測試（script header 有明確說明規定）。

## 不接受的短期做法

- 不接受只靠 host firewall 擋 Postgres/backend port。
- 不接受繼續使用 production compose publish internal services。
- 不接受只在前端 debounce view/like。
- 不接受只靠 client `visitorId` 當 like 防濫用。
- 不接受 revalidate route 只檢查 secret、不檢查 path scope。
- 不接受把 dependency audit high/critical 永久忽略但沒有 exception 文件。

## 建議執行順序

1. Phase 1：先收斂 production network boundary。
2. Phase 2：補 public write rate limit 與 abuse guard。
3. Phase 3：鎖 revalidate path scope。
4. Phase 4：處理 dependency audit。
5. Phase 5：收斂外部圖片來源策略。
6. Phase 6：把安全測試固定化。

## 目前結論

使用者列出的問題成立，且優先順序合理。

最需要立即處理的是部署層 P0：Postgres 與 backend 不應在 production 直接 publish 到 host。這兩項修完後，再處理公開寫入 API 的防濫用，才是系統化且長期穩定的路線。
