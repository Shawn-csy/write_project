# CI 流程

正式服務拓樸、發布流程與維運總覽見 [正式架構](../architecture/production-architecture.md)。

最後更新：2026-11-13

GitHub Actions 已啟用兩個工作流程：`Public read and security contracts` 與 `Submission workflows`。兩者對 main push 和 pull request 使用相同的 paths，確保同一版本的部署閘門都會啟動。

## 變更範圍

工作流程涵蓋 `src/**`、`packages/**`、`apps/public/**`、`server/**`、`public/**`、`deploy/**`、`nginx.conf`、`.dockerignore`、`scripts/**`、所有 `.github/workflows/**`，以及根目錄的 package/lock、HTML、TypeScript、Vite/Vitest、Tailwind/PostCSS、Dockerfile 和 Docker Compose 設定。因此僅修改 studio、共用套件、nginx 或 release/deploy 設定也會執行檢查。只修改 `docs/**` 或 README 不會啟動這兩個工作流程，也不會觸發自動部署。

## 必要檢查

Actions 使用 Node.js 22、Python 3.13，並以 `npm ci` 安裝鎖定的前端依賴。

`Public read and security contracts` 包含：

- 後端依賴稽核、production network boundary、後端完整契約測試。
- CI 工作流程契約回歸檢查：`python3 scripts/check-ci-contracts.py`。
- 根目錄型別檢查：`npm run typecheck`。
- studio 與共用套件測試：`npx vitest run --project main`。
- studio 正式建置：`npm run build`。
- public 測試與獨立型別檢查：`npx vitest run apps/public`、`npx tsc --noEmit -p apps/public/tsconfig.json`。
- 正式 Pages 靜態建置：`python3 scripts/check-public-builds.py`，使用本機唯讀 API fixture，不依賴 production API。

`Submission workflows` 另外執行投稿、審核與回饋的後端契約及 public 表單測試。以上步驟失敗會使工作流程失敗。

## 部署串接

既有 `Deploy production` 監聽上述兩個固定名稱的 workflow completion；只有本 repository 的 main push 成功事件可自動進入部署。`scripts/release.sh` 會再確認同一個 main commit 的 CI 都已成功，尚有執行中的 CI 則回傳 3，等待後續 completion 事件。因此請保留兩個名稱與一致的觸發範圍。手動 `workflow_dispatch` 是既有的獨立入口，不受 docs-only 自動觸發規則影響。

## 本機檢查

可逐項執行上述指令；僅檢查 workflow 契約不需要安裝任何依賴。`bash scripts/ci.sh` 是既有的本機前後端測試、型別及依賴稽核工具，並未等同所有 Actions 建置步驟。其 `AUTO_DEPLOY=1` 會另外呼叫部署腳本，單純驗證時不要設定此變數。

端對端測試仍可另外執行 `npx playwright test`；目前不是這兩個工作流程的必要閘門。

內容更新沿用 Python 標準函式庫測試探索，驗證公開資料擷取、內容指紋、固定快照服務、鎖、正式版本解析與失敗重試。`check-public-builds.py` 實際匯出「新增／修改／下架」和「公開目錄完全清空」兩份 Pages 產物；匯出前關閉原始 fixture API，只讓建置讀快照。內容排程只有 schedule／manual 事件，與程式發布互斥，第二次 checkout 綁定解析出的正式 SHA，不接受 PR 事件或修改 API／資料庫。
