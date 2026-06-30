# Production Security Hardening Plan

最後更新：2026-06-30

## 目的

本文件整理目前公開網站與後端部署架構中已確認的資安風險，並定義長期、系統性、可驗收的改善路線。

這不是功能開發文件，也不是短期補丁清單。目標是把正式環境的攻擊面、公開寫入 API、防濫用、快取重建權限、外部媒體來源與依賴漏洞治理成一套穩定的安全基線。

## 範圍

包含：

- `docker-compose.prod.yml`
- `nginx.conf`
- FastAPI backend public/private API 邊界
- Next.js public BFF / revalidation route
- 公開寫入 API：view、like、terms acceptance
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
| P0 | Postgres port 對外 publish 且有弱預設密碼 | Confirmed | DB 可能直接暴露到 host network |
| P0 | Backend API port 對外 publish，繞過 nginx | Confirmed | 攻擊者可直接打 backend，繞過 ingress policy |
| P1 | 公開寫入 API 無足夠 rate limit | Confirmed | DB bloat、view/like 刷數、terms acceptance 濫用 |
| P1 | like 去重依賴 client-controlled `visitorId` | Confirmed | 攻擊者可偽造 visitorId 造成互動數據失真 |
| P2 | `/api/revalidate` path 無白名單、無數量與長度上限 | Confirmed | secret 洩漏後可 DoS ISR cache / 重渲染 |
| P2 | production dependency audit 有 high/critical 項目 | Confirmed | 供應鏈風險與已知 CVE |
| P3 | 外部圖片 fallback 到 browser `<img>` | Confirmed | 非 SSRF，但會讓訪客向第三方來源發請求 |

## 風險細節

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

- [ ] `docker-compose.prod.yml` 只對外 publish nginx。
- [ ] Postgres 只在 internal network 可達。
- [ ] Backend 只被 nginx / public Next container 內部呼叫。
- [ ] production 未提供 DB secret 時 fail fast。

### Phase 2 — Public Write Rate Limits

任務：

- 為 view / like / terms acceptance 加 explicit limiter。
- 建立 `public_write_key_func`，支援 `cf-connecting-ip` / `x-forwarded-for` / client fallback。
- view 加短時間去重策略。
- like 加 server-side abuse guard，不只依賴 visitorId。
- terms acceptance 加欄位長度與 body 限制。

驗收：

- [ ] 同 IP 快速重複 view 不會無限制增加 counter。
- [ ] 偽造大量 visitorId 不能快速灌 like。
- [ ] terms acceptance 大量寫入會被 429。
- [ ] 對應 pytest 覆蓋。

### Phase 3 — Revalidate Scope Lockdown

任務：

- 新增 `validateRevalidatePath(path)` pure helper。
- 限制 path pattern、長度、數量。
- 對非法路徑回傳 400，不 silently ignore。
- 保留 secret 檢查。

驗收：

- [ ] 合法公開路徑可 revalidate。
- [ ] `/api/*`、`//evil`、帶 query/hash、超長 path 被拒絕。
- [ ] 一次 payload 超過上限被拒絕。
- [ ] route handler tests 覆蓋。

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

- [ ] audit false positive 消失。
- [ ] high/critical 有修復或文件化 exception。
- [ ] lockfile 更新可重現。

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

- [ ] 未知外部圖片不會無聲載入追蹤來源，除非產品明確允許。
- [ ] allowlist 行為有單元測試。
- [ ] UI 有合理 fallback。

### Phase 6 — Security Regression Suite

任務：

- 建立固定 security test command。
- 將 deployment boundary 檢查加入文件或 script。
- 加入 API abuse tests。
- 加入 revalidate validation tests。

驗收：

- [ ] local security test command 文件化。
- [ ] CI 可執行最小安全測試集合。
- [ ] 新增 public write endpoint 時需附 rate limit 測試。

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
