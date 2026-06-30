# Dependency Audit Exceptions

最後更新：2026-06-30

## 已修復項目

| 套件 | 漏洞 | 修法 | 日期 |
|---|---|---|---|
| `react-router` / `react-router-dom` | RCE, XSS, CSRF, DoS (high) | 升到 7.18.1+ | 2026-06-30 |
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
