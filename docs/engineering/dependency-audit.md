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

當時的處置是集中 mock `next/link` 作為權宜措施。統一 React 版本後已驗證
不再需要（移除 mock 後 `--project public` 62 檔 / 656 測試全過），該 mock
與相關的 `resolve.alias` / `dedupe` 皆已移除，`vitest.config.ts` 回復原狀。

**2. 測試檔進入正式建置的型別檢查**

`apps/public/tsconfig.json` 的 include 涵蓋 `**/*.tsx`，測試前置檔一旦放進
該目錄就會把 vitest 型別帶進 `npm run build:public` 的檢查範圍，使原本鬆散的
測試斷言變成嚴格檢查而讓建置失敗。

處置：`apps/public/tsconfig.json` 排除測試檔，與 root `tsconfig.json` 的既有
慣例一致（root 同樣排除 `**/*.test.ts`、`__tests__/**`）。測試由 vitest 執行。

### 根本解法：統一 React 版本（2026-08-21 完成）

兩份 React 的來源是 root（Vite SPA）與 `apps/public`（Next 16）宣告不同版本，
npm 因而巢狀安裝。統一到 **React 19.2.4** 後 `apps/public` 不再有巢狀副本，
這一類問題從源頭消失。

唯一的阻擋是 **`react-helmet-async` 不支援 React 19**（peer 僅到 `^18.0.0`）。
已以 `src/lib/useHeadTags.ts` 取代 —— 命令式套用 title 與 head 標籤、卸載時還原，
輸出與原本完全一致並於正式站實測比對。唯一使用處 `EditorShell` 是純 client、
登入後的工作區路由，用不到 helmet 的巢狀覆寫 / SSR 收集 / 優先序合併。

其餘 React 相依套件（`@dnd-kit/*` `>=16.8.0`、`@uiw/react-codemirror` `>=17.0.0`、
`react-router-dom` `>=18`、`@write/*` `>=18`）本來就允許 19，升級後測試與建置
皆未出現相容性問題。

#### 順帶暴露的既有測試型別問題

vitest 4.1 起 `Assertion` 型別收斂，不再隱式套用 matcher，也讓原本鬆散的斷言
變成嚴格檢查，翻出 5 個既有問題（皆已修正）：

| 問題 | 實際情況 |
|---|---|
| `TocEntry` fixture 使用 `level` / `blockIndex` | 實際型別為 `lineStart`，fixture 過時 |
| `pickRenderedRoot` mock 未宣告可為 null | 但 `usePublicExport.ts` 就是以 falsy 判斷 |
| `fetchMock.mock.calls` 解構成 `[string]` | 過窄，實際為 `any[]` |
| `coverDesign` fixture 形狀不符 | 實際為 `{ bg, title, ... }` |
| `renderHook` 的 `initialProps` 用 `as const` | 過度窄化成字面量，`rerender` 無法傳其他值 |

另新增 `apps/public/vitest-env.d.ts` 引用 jest-dom 型別。

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
| `react-helmet-async` | 不支援 React 19，阻擋版本統一 | **移除**：以 `src/lib/useHeadTags.ts` 取代 | 2026-08-21 |

## 每季 Audit 流程

```bash
npm audit --omit=dev
```

- 新增 high/critical → CI 會直接失敗（見上方「CI 把關」），必須處理或更新本文件
- 新增 moderate → 下一個 sprint 前評估
- critical 且無法在兩週內修復 → 升級為 blocker
