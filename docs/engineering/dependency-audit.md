# Dependency Audit Exceptions

最後更新：2026-08-20

## next 16.3.1 升級（2026-08-20 完成）

`npm audit --omit=dev`：**0 critical / 0 high / 2 moderate**（原為 0 / 7 / 3）。

| 套件 | 漏洞 | 處置 |
|---|---|---|
| `sharp`（經 next） | libvips CVE-2026-33327 等 | ✅ next 升 16.3.1 帶入 sharp 0.35.3 |
| `next` 16.2.7 | Middleware / Proxy bypass | ✅ 同上（本專案無 middleware.ts，原本即不成立） |
| `react-router-dom` | RSC Mode CSRF Bypass | ✅ 升 7.18.2 |
| `brace-expansion` / `nanoid` | DoS | ✅ `npm audit fix` |

### 過程中解決的連鎖問題

**1. next 巢狀安裝造成測試出現兩份 React**

16.2.7 時 `next` 被提升到 root `node_modules`；16.3.1 起改為巢狀安裝在
`apps/public/node_modules`。next 的 client 元件是 CJS，內部以 `require("react")`
解析，會繞過 Vite 的 `resolve.alias` 與 `resolve.dedupe`：

```
next/dist/client/link.js  → apps/public/node_modules/react   (19.2.4)
renderWithHooks           → node_modules/react-dom           (18.3.1)
→ TypeError: Cannot read properties of null (reading 'useContext')
```

也就是說，升級前能通過是安裝佈局的巧合，不是設計。

處置：於 `apps/public/test-setup.tsx` 集中 mock `next/link`（專案既有做法，
`PublicInfoMenu.test.tsx` 等已各自 mock），改為集中避免逐檔重複。

**2. 測試檔進入正式建置的型別檢查**

`apps/public/tsconfig.json` 的 include 涵蓋 `**/*.tsx`，測試前置檔一旦放進
該目錄就會把 vitest 型別帶進 `npm run build:public` 的檢查範圍，使原本鬆散的
測試斷言變成嚴格檢查而讓建置失敗。

處置：`apps/public/tsconfig.json` 排除測試檔，與 root `tsconfig.json` 的既有
慣例一致（root 同樣排除 `**/*.test.ts`、`__tests__/**`）。測試由 vitest 執行。

### 根本解法（尚未執行）

兩份 React 的來源是 root（Vite SPA，React 18）與 `apps/public`（Next 16，React 19）
宣告不同版本。統一到 React 19 即可根除這一類問題。

阻擋項目：**`react-helmet-async` 不支援 React 19**（peer 僅到 `^18.0.0`），
使用處為 `src/main.tsx` 與 `src/components/common/MetaTags.tsx`。
其餘 React 相依套件（`@dnd-kit/*` `>=16.8.0`、`@uiw/react-codemirror` `>=17.0.0`、
`react-router-dom` `>=18`、`@write/*` `>=18`）皆允許 19。

公開頁 SEO 已由 Next 接手，工作區 SPA 是否仍需要 helmet 值得重新評估。

## 已接受風險（Accepted Risk）

### exceljs → uuid — moderate

- **CVE**：uuid 使用不安全的隨機數生成
- **緩解措施**：exceljs 用 uuid 只在產生 xlsx 內部 cell reference，
  不用於任何 security-sensitive 用途（非 token、非 session ID）
- **修法路徑**：等 exceljs 升版採用 uuid >=11

## CI 把關

自 2026-08-20 起 `scripts/ci.sh` 會執行 `npm audit --omit=dev`：

- **high 以上** → 直接讓 CI 失敗

原本的「每季人工 audit」規定實際上會逾期 —— 本文件在 2026-06-30 到 08-20 之間
未更新，期間 `react-router` 中了新的 CSRF advisory 卻沒被發現。

## 已修復項目

| 套件 | 漏洞 | 修法 | 日期 |
|---|---|---|---|
| `react-router` / `react-router-dom` | RCE, XSS, CSRF, DoS (high) | 升到 7.18.1+ | 2026-06-30 |
| `react-router` / `react-router-dom` | RSC Mode CSRF Bypass (high) —— 7.18.1 又落入新 advisory 範圍 | 升到 7.18.2 | 2026-08-20 |
| `firebase` → `@grpc/grpc-js` / `protobufjs` | critical/high | 升 firebase 到 12.15.0+，拉進修復版 grpc/protobuf | 2026-06-30 |
| `xlsx` | high (prototype pollution, ReDoS) | **移除**：package 未被任何 src import；xlsx export 由 backend Python 處理 | 2026-06-30 |
| `tmp` | high (path traversal) | npm audit fix | 2026-06-30 |
| `brace-expansion` / `minimatch` | moderate | npm audit fix | 2026-06-30 |
| `postcss` (root devDep) | moderate | 升到 ^8.5.10 | 2026-06-30 |
| `next` → `postcss` / `sharp` | XSS, libvips CVE (high) | 升 next 到 16.3.1 | 2026-08-20 |
| `brace-expansion` / `nanoid` | DoS (high) | npm audit fix | 2026-08-20 |

## 每季 Audit 流程

```bash
npm audit --omit=dev
```

- 新增 high/critical → CI 會直接失敗（見上方「CI 把關」），必須處理或更新本文件
- 新增 moderate → 下一個 sprint 前評估
- critical 且無法在兩週內修復 → 升級為 blocker
