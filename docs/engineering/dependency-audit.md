# Dependency Audit Exceptions

最後更新：2026-08-20

## ⚠️ 待處理：next 16.2.7 → 16.3.1

`npm audit --omit=dev` 目前有 **7 個 high**。其中兩條由升級 `next` 到 16.3.1 一次解決：

| 套件 | 漏洞 | 實際暴露 |
|---|---|---|
| `sharp`（經 next） | libvips CVE-2026-33327 等 | **有** —— `next/image` 會處理使用者上傳的封面圖 |
| `next` 16.2.7 | Middleware / Proxy bypass | **無** —— 專案沒有 `middleware.ts`，前提不成立 |
| `react-router` 7.18.1 | RSC Mode CSRF Bypass | **中** —— 工作區需登入，但 CSRF 正是打已登入使用者（7.18.2 已修） |

**為何尚未執行**（2026-08-20 嘗試後回退）：

`npm i next@16.3.1 && npm audit fix` 會連帶更動約 70 個套件，並把 `next` 從 root
`node_modules` 移到 `apps/public/node_modules`。這使 vitest 的 `public` 專案在
同一次 render 中出現兩份 React（測試檔解析到 `apps/public` 的 React 19，
root 的 `@testing-library/react` 解析到 React 18），出現 `Invalid hook call`，
前端測試 40 個失敗。在 `vitest.config.ts` 為 `public` 專案加 react alias 後
情況更糟（290 個失敗）。

需要獨立處理，建議步驟：
1. 先釐清 root（React 18 / Vite SPA）與 `apps/public`（React 19 / Next）的
   React 解析邊界，可能需要把 `@testing-library/react` 也裝進 `apps/public`
2. 再執行升級並確認 `npm test` 全綠
3. 最後把 `scripts/ci.sh` 的 audit 門檻由 `critical` 收緊回 `high`

## CI 把關

自 2026-08-20 起 `scripts/ci.sh` 會執行 `npm audit --omit=dev`：

- **critical** → 直接讓 CI 失敗
- **high** → 印出警告與數量（待上述升級完成後改為阻擋）

原本的「每季人工 audit」規定實際上會逾期 —— 本文件在 2026-06-30 到 08-20 之間
未更新，期間 `react-router` 中了新的 CSRF advisory 卻沒被發現。

## 已修復項目

| 套件 | 漏洞 | 修法 | 日期 |
|---|---|---|---|
| `react-router` / `react-router-dom` | RCE, XSS, CSRF, DoS (high) | 升到 7.18.1+ | 2026-06-30 |
| ~~`react-router` 已修復~~ | ⚠️ 2026-08-20 更正：7.18.1 又落入新的 RSC CSRF advisory 範圍，須升到 7.18.2 | 見上方待處理 | — |
| `firebase` → `@grpc/grpc-js` / `protobufjs` | critical/high | 升 firebase 到 12.15.0+，拉進修復版 grpc/protobuf | 2026-06-30 |
| `xlsx` | high (prototype pollution, ReDoS) | **移除**：package 未被任何 src import；xlsx export 由 backend Python 處理 | 2026-06-30 |
| `tmp` | high (path traversal) | npm audit fix | 2026-06-30 |
| `brace-expansion` / `minimatch` | moderate | npm audit fix | 2026-06-30 |
| `postcss` (root devDep) | moderate | 升到 ^8.5.10 | 2026-06-30 |

## 已接受風險（Accepted Risk）

### next → postcss — moderate（XSS in CSS stringify）

- **CVE**: GHSA-qx2v-qp2m-jg93
- **情況**：next 16.2.7 內部使用舊版 postcss（nested node_modules）；root override 無法強制替換
- **fix available via `npm audit fix --force`** 但會降 next 到 9.x（breaking change）
- **緩解措施**：postcss 只在 build time 執行，不處理 runtime user input；XSS 向量需要攻擊者控制 CSS input，在此 build pipeline 中不成立
- **修法路徑**：等 next 升版內部升級 postcss，或提 next issue
- **下次 review**：Next.js 下次主版本升級時

### exceljs → uuid — moderate

- **CVE**：uuid 使用不安全的隨機數生成
- **情況**：`package.json` overrides 已將 uuid 提升到 9.0.1（`npm ls uuid` 顯示 `overridden`），但 advisory 要求 >=11.1.1；9.x 仍在受影響範圍
- **緩解措施**：exceljs 用 uuid 只在產生 xlsx 內部 cell reference，不用於任何 security-sensitive 用途（非 token、非 session ID）
- **修法路徑**：等 exceljs 升版採用 uuid >=11；或當 uuid advisory 有新 fix 時更新 override

## 每季 Audit 流程

```bash
npm audit --omit=dev
```

- 新增 high/critical → 必須在本 sprint 處理或更新 exception 文件
- 新增 moderate → 下一個 sprint 前評估
- critical 且無法在兩週內修復 → 升級為 blocker
