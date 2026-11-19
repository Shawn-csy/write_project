# CI 流程

正式服務拓樸、發布流程與維運總覽見 [正式架構](../architecture/production-architecture.md)。

最後更新：2026-11-16

程式 CI 有兩個工作流程：`Public read and security contracts` 與 `Submission workflows`。兩者對 main push 和 pull request 使用相同的 paths，確保同一版本的部署閘門都會啟動。

## 變更範圍

工作流程涵蓋 `src/**`、`packages/**`、`apps/public/**`、`server/**`、`public/**`、`deploy/**`、`.dockerignore`、`scripts/**`、所有 `.github/workflows/**`，以及根目錄的 package/lock、HTML、TypeScript、Vite/Vitest、Tailwind/PostCSS、Dockerfile 和 Docker Compose 設定。因此僅修改 studio、共用套件、nginx 或 release/deploy 設定也會執行檢查。兩組 paths 最後以 `!**/*.md` 排除根目錄及任意子目錄的 Markdown，包括 README、CHANGELOG 與 scripts 內的文件；`docs/**` 的非 Markdown 檔案仍屬程式 CI 範圍。文件與程式混合修改仍會啟動兩組完整 CI。新增、刪除 Markdown 同樣適用，重新命名須留意來源與目的路徑；程式移入 docs 也不會變成文件例外。

獨立的 `Documentation checks` 在 Markdown、檢查器、測試或 workflow 修改時執行，不安裝應用程式依賴。它檢查所有 tracked Markdown 的相對連結／本機圖片目標、reference link 與未關閉的 fenced code block，忽略 URL、頁內 anchor、inline code 與 fenced code 範例，不依賴網路。只改 Markdown 不會產生兩個程式 CI 的 completion，因此不觸發自動部署。目前 tracked Markdown 都是文件或 agent 指引，沒有 runtime Markdown 資料；未來新增此類資料必須在兩組 paths 排除後加入明確正向例外及契約測試。

檢查器是輕量的 Markdown 子集，並非完整 CommonMark parser；不驗證 anchor 是否存在、Mermaid 語法或遠端 URL，不引入 Mermaid／瀏覽器依賴。修改後可執行 `python3 scripts/checks/check-docs.py` 與 `python3 -m unittest discover -s scripts/tests -p 'test_check_docs.py'`。

目前 main 沒有 branch protection／ruleset。若未來要求必過 checks，須考慮 GitHub paths 略過的 workflow 不會回報成功；不可直接把兩個有 paths 篩選的程式 workflow 設成所有 PR 的必要檢查。

## 必要檢查

Actions 使用 Node.js 22、Python 3.13，並以 `npm ci` 安裝鎖定的前端依賴。

`Public read and security contracts` 包含：

- 後端依賴稽核、production network boundary、後端完整契約測試。
- CI 工作流程契約回歸檢查：`python3 scripts/checks/check-ci-contracts.py`。
- 根目錄型別檢查：`npm run typecheck`。
- studio 與共用套件測試：`npx vitest run --project main`。
- studio 正式建置：`npm run build`。
- public 測試與獨立型別檢查：`npx vitest run apps/public`、`npx tsc --noEmit -p apps/public/tsconfig.json`。
- 正式 Pages 靜態建置：`python3 scripts/checks/check-public-builds.py`，使用本機唯讀 API fixture，不依賴 production API。

`Submission workflows` 另外執行投稿、審核與回饋的後端契約及 public 表單測試。以上步驟失敗會使工作流程失敗。

## 部署串接

既有 `Deploy production` 監聽上述兩個固定名稱的 workflow completion；只有本 repository 的 main push 成功事件可自動進入部署。`scripts/release/release.sh` 會再確認同一個 main commit 的 CI 都已成功，尚有執行中的 CI 則回傳 3，等待後續 completion 事件。因此請保留兩個名稱與一致的觸發範圍。文件檢查的成功不能替代這兩個程式閘門。手動 `workflow_dispatch` 雖是獨立入口，仍須通過精確 SHA 的兩組程式 CI，不會把 skipped／未出現的 workflow 當成成功。

文件提交後 main SHA 可以合理領先正式 deployed SHA；內容更新仍解析正式 live SHA 並 checkout 該版本。自動程式部署固定使用成功觸發事件的完整 SHA，兩組程式 CI 必須屬於此 SHA。候選到目前 main 的 first-parent 每一步都只改一般非執行 `.md` 檔時可發布；中間出現程式改動（即使後來還原）、非 Markdown 或特殊檔案則拒絕。cutover 前重新檢查；手動與 resume 同樣不借用其他 SHA 的 CI。詳見 [持續部署](continuous-deployment.md)。

## 本機檢查

可逐項執行上述指令；僅檢查 workflow 契約不需要安裝任何依賴。`bash scripts/ci.sh` 是既有的本機前後端測試、型別及依賴稽核工具，並未等同所有 Actions 建置步驟。正式部署由 GitHub Actions 的發布流程執行。

端對端測試仍可另外執行 `npx playwright test`；目前不是這兩個工作流程的必要閘門。

內容更新沿用 Python 標準函式庫測試探索，驗證公開資料擷取、內容指紋、固定快照服務、鎖、正式版本解析與失敗重試。`check-public-builds.py` 實際匯出「新增／修改／下架」和「公開目錄完全清空」兩份 Pages 產物；匯出前關閉原始 fixture API，只讓建置讀快照。內容排程只有 schedule／manual 事件，與程式發布互斥，第二次 checkout 綁定解析出的正式 SHA，不接受 PR 事件或修改 API／資料庫。
