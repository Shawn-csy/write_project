# 自動部署（CD）

最後更新：2026-11-11

## 流程

main 有新的 push，而且這個 commit 觸發的 CI workflow（`Public read and security contracts`、`Submission workflows`）**全部完成且通過**時，`.github/workflows/deploy.yml` 會在正式機器上的自架 runner 執行：

```
scripts/release.sh auto
  build     建 API／公開站映像與工作室靜態檔（tag：auto-<commit 前 7 碼>）
  schema    有缺口就自動套用：先在正式資料副本排練讀寫、完整備份，再遷移
  prepare   候選版在現行網站旁啟動，跑 14 條路徑、IPv4／IPv6、讀寫限流、RSC 快取邊界檢查
  activate  交接 1090，接著在新 API 執行身份收斂
  pages     建置並上傳 Cloudflare Pages
  verify    正式網域煙霧測試
  retire-ancestors  停用比直接回滾版本更舊的 API／公開站
  prune     刪除更舊版本的容器、映像、靜態檔、控制資料與建置輸出
```

## 舊版本清理

每次發布會留下一組 Docker 映像（API 約 1 GB、公開站約 340 MB）與一份靜態檔。`release.sh auto` 在切流成功後執行 `site-release.py prune`：

- **保留**：正式版，以及它記錄的回滾目標（`release.json` 的 `previous_edge`）。兩者的容器、映像、靜態檔與控制資料都完整留著，`rollback` 隨時可用。
- **刪除**：更舊版本的 `wp-site-<tag>-*` 容器、`write_project-backend/public:<tag>` 映像、`releases/<tag>`、`releases/.site-release/<tag>` 與 `dist/releases/<tag>`；保留版本已複製到 `releases/` 的 `dist/releases` 建置輸出也一併刪除。
- **不會碰**：還有容器在執行的版本（例如部署中途）整個略過；正式版缺少發布紀錄時拒絕清理；刪映像不加 `-f`，任何容器使用中的映像都刪不掉。其他專案（如 `motto_web`）、PostgreSQL 映像、Dev 映像與共用的 Docker build cache 都不在範圍內。
- 清理失敗不會讓已上線的部署變成失敗，只會在 log 留紀錄。

手動執行：

```bash
bash scripts/release.sh prune --dry-run   # 先看會刪什麼
bash scripts/release.sh prune
```

刪掉的版本無法再用 `rollback` 接回；需要時從對應 commit 重新建置。

任一步失敗就停在那裡：`prepare` 之前失敗不影響正式站；`activate` 驗證失敗會自動接回原入口。失敗時 GitHub 會寄出 workflow 失敗通知，這台 Mac 也會跳出系統通知。

兩組 CI 有不同的路徑篩選，某個 commit 可能只跑其中一組。規則是「這個 commit 跑過的 workflow 全部綠燈」；還有 workflow 在跑時，部署 job 會直接結束（`release.sh` 回傳 3），等最後一組完成時再觸發。只改文件、沒有觸發任何 CI 的 commit 不會部署。同一個 commit 不會重複部署；失敗過的 tag 不會自動重試，需要人工檢查後清掉（`site-release.py stop-prepared --tag auto-<sha>`）或推新的 commit。

手動觸發：GitHub → Actions → `Deploy production` → Run workflow（部署當下的 main）。

## 安全邊界

repo 是公開的，runner 跑在正式機器上，因此：

- **fork PR 的 workflow 一律要人工核准才會執行**（repo 設定 *Actions → Fork pull request workflows from outside collaborators* = *Require approval for all external contributors*，2026-11-11 設定）。核准外部 PR 的 workflow 前，先確認它沒有修改 `.github/workflows/` 或指定 `runs-on: self-hosted`。
- 部署 job 只接受本 repo 自己對 main 的 `push` 事件；fork PR 的分支即使也叫 `main`，產生的 `workflow_run` 也不會被接受（`head_repository` 檢查）。
- workflow token 預設唯讀；部署 job 只要 `contents: read`、`actions: read`。
- runner 以使用者 `shanti` 身分執行（launchd LaunchAgent），能操作 Docker、Cloudflare（wrangler 登入）與正式資料庫。不要把這個 runner 的標籤 `write-project-prod` 用在其他 workflow。

## Runner

| 項目 | 值 |
|---|---|
| 名稱／標籤 | `write-project-prod-mac`／`self-hosted, macOS, ARM64, write-project-prod` |
| 目錄 | `~/actions-runner-write-project`（工作目錄 `_work/`） |
| 服務 | launchd `actions.runner.Shawn-csy-write_project.write-project-prod-mac` |

同一台機器另有 `~/actions-runner`，是 MAINPAGE 專案的 runner，兩者互不相干。

```bash
cd ~/actions-runner-write-project
./svc.sh status      # 服務狀態
./svc.sh stop        # 暫停自動部署（GitHub 上的 job 會排隊等待）
./svc.sh start
```

暫停自動部署也可以在 GitHub 停用 `Deploy production` workflow。

runner 從自己的 checkout 建置，但兩樣東西必須用正式位置：

- `WP_RELEASE_ROOT=/Users/shanti/Desktop/write_project/releases`：正式入口掛載的靜態檔與發布控制資料。
- `WP_STUDIO_ENV_FILE=/Users/shanti/Desktop/write_project/.env`：工作室建置需要的公開 Firebase 設定（不進 git）。

## 回滾

與手動發布相同：`python3 scripts/site-release.py rollback --tag auto-<sha>` 接回上一版入口；Cloudflare Pages 從部署記錄回滾。schema 遷移與身份收斂寫入的資料不會回滾，需要時從 `~/write_project_backups/` 的備份還原。
