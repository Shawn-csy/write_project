# 自動部署（CD）

正式服務拓樸、發布流程與維運總覽見 [正式架構](../architecture/production-architecture.md)。

最後更新：2026-11-16（精簡流程已部署並驗證）

2026-11-16 正式驗收：[程式發布 run](https://github.com/Shawn-csy/write_project/actions/runs/43798799241)、[內容刷新 run](https://github.com/Shawn-csy/write_project/actions/runs/43799579143)。

## 流程

main 有新的 push，而且這個 commit 觸發的 CI workflow（`Public read and security contracts`、`Submission workflows`）**全部完成且通過**時，`.github/workflows/deploy.yml` 會在正式機器上的自架 runner 執行：

```
scripts/release/release.sh auto
  build     建 API 映像與工作室靜態檔（tag：auto-<commit 前 7 碼>）
  schema    有缺口就自動套用：先在正式資料副本排練讀寫、完整備份，再遷移
  prepare   候選 API／入口在現行網站旁啟動，驗證工作室、API、媒體路由、公開站轉址、IPv4／IPv6 與讀寫限流
  activate  交接 1090（先寫入 activation-intent）
  converge  在新 API 執行身份收斂，成功後才進入 Pages
  pages     建置並上傳 Cloudflare Pages
  verify    正式網域煙霧測試
  retire-ancestors  停用比直接回滾版本更舊的 API／公開站
  prune     刪除更舊版本的容器、映像、靜態檔、控制資料與建置輸出
```

## 舊版本清理

新版發布只建立 API 映像與工作室靜態檔，不再建立 Next server 映像。舊版回滾目標仍可能包含 Next server，須依舊版紀錄完整保留。`release.sh auto` 在 Pages／驗證成功並寫入 `complete` 後執行 `site-release.py prune`：

- **保留**：正式版，以及它記錄的回滾目標（`release.json` 的 `previous_edge`）。兩者的容器、映像、靜態檔與控制資料都完整留著，`rollback` 隨時可用。
- **刪除**：更舊版本的 `wp-site-<tag>-*` 容器、`write_project-backend/public:<tag>` 映像、`releases/<tag>`、`releases/.site-release/<tag>` 與 `dist/releases/<tag>`；保留版本已複製到 `releases/` 的 `dist/releases` 建置輸出也一併刪除。
- **不會碰**：還有容器在執行的版本（例如部署中途）整個略過；正式版缺少發布紀錄時拒絕清理；刪映像不加 `-f`，任何容器使用中的映像都刪不掉。其他專案（如 `motto_web`）、PostgreSQL 映像、Dev 映像與共用的 Docker build cache 都不在範圍內。
- 清理失敗不會讓已上線的部署變成失敗，只會在 log 留紀錄。

手動執行：

```bash
bash scripts/release/release.sh prune --dry-run   # 先看會刪什麼
bash scripts/release/release.sh prune
```

刪掉的版本無法再用 `rollback` 接回；需要時從對應 commit 重新建置。

任一步失敗就停在那裡：`prepare` 之前失敗不影響正式站；`activate` 驗證失敗會自動接回原入口。失敗時 GitHub 會寄出 workflow 失敗通知，這台 Mac 也會跳出系統通知。

兩組 CI 使用相同的路徑篩選；對精確完整 commit SHA，兩組具名 workflow 都必須完成並成功。只讀取 main push 的最新 run（GitHub run list 回傳該 run 最新 rerun 的狀態），排除 Deploy production 本身、其他 workflow 與 PR。任一組尚未出現或仍執行中回傳 3，失敗則停止。只改 Markdown 文件由獨立的 `Documentation checks` 檢查，沒有兩組程式 CI completion 的 commit 不會自動部署。此時 main 可以領先正式 deployed SHA；內容刷新仍固定使用 live SHA。手動部署仍須滿足精確 SHA 的兩組成功 CI，不會接受 skipped／未出現的檢查。

自動部署固定 checkout 成功觸發事件的 `workflow_run.head_sha`，建置、journal、tag 均使用該精確 SHA，不會在建置中追隨 main。候選必須位於目前 main 的 first-parent 歷史；從候選到 main 的每一步 first-parent tree 變更都只能是 `.md` 一般非執行檔（可位於根目錄、apps、packages 或其他路徑）。合併提交按 main 第一父節點的實際變更判斷；任一程式／設定／workflow／非 Markdown 變更、程式改動後又還原、程式改名成 Markdown、特殊檔案或離開 main 主線均拒絕。build 原有重驗仍保留，prepare 後、cutover 前再驗一次，阻擋建置期間抵達的新程式；切換之後不再因 main 前進中斷收斂。檢查與實際切換仍有短暫時間窗，並非遠端 main 的原子鎖。

手動 workflow_dispatch 使用事件本身的 `github.sha`，本機手動／resume 使用目前 checkout；都要通過相同精確 SHA CI 與主線檢查，沒有任意選擇舊綠燈或 latest-green fallback。resume／complete no-op 仍驗乾淨 checkout 與候選 CI，允許 Markdown 後繼；若主線已出現新程式則拒絕，須先檢視現行入口與 journal。

## 中斷後續跑

`all`、`auto`、`resume` 由 `scripts/release/release-workflow.py` 持有整段流程的非阻塞 `flock`，macOS/Linux 都支援。鎖檔位於 `$WP_RELEASE_ROOT/.release-workflow/.lock`，與 site-release 的鎖獨立，檔案存在不代表被鎖住；不用刪鎖檔。鎖 FD 不傳給子程序。每次執行（含已完成的 no-op）都重新檢查乾淨工作樹、pushed main 和 CI。

控制 journal 是 `$WP_RELEASE_ROOT/.release-workflow/<tag>.json`，不在可公開讀取的靜態目錄內。內容包括完整 commit SHA、tag、phase、入口 ID、時間戳與失敗的 phase/exit code，不保存命令輸出或秘密。寫入採暫存檔、fsync、原子 replace。phase 依序為 `preparing` → `activation-intent` → `activated` → `converged` → `pages` → `verified` → `complete`；只有命令成功才推進。API 已上線仍不代表整體完成。

```bash
bash scripts/release/release.sh status auto-<sha前7碼>
bash scripts/release/release.sh resume auto-<sha前7碼>
```

- 收斂失敗：重跑收斂，再部署 Pages、驗證。
- Pages 失敗：保留 API，重跑 Pages 與驗證。
- 驗證失敗：只重跑驗證，不重跑 Pages 或資料收斂。
- activation 成功後、journal 寫入前中斷：既有 durable intent 加上精確 live edge/API/public/static 會被重新核對，再記錄實際 ingress ID，接續收斂，不重新 activate 或 build。
- matching complete：再次檢查 guard 與入口後直接成功，不重複發布。

切流子程序結束後（續跑則在第一次入口檢查前），編排器另持有既有 `.site-release/.lock` 直到 complete，阻擋低階 rollback/activate 與收斂、Pages、驗證同時發生；取得鎖後重新讀入口。清理前先釋放這把鎖，再由 retire/prune 自行鎖定。每個切流後步驟前後，以及標記 complete、清理之前，都重新核對 live ingress 的完整 ID、edge、API/public upstream 和 static 掛載。已回滾、被其他發布取代、commit 不符或沒有 journal 的舊發布一律停止；請先看 `site-release.py status` 與 journal，回到精確的 pushed main commit，或用新的 commit/tag 發布，不能刪 journal 強行續跑。

此機制只自動恢復切流後的工作。build/schema/prepare 失敗，或 intent 已寫入但候選版沒有真正上線時，會保留記錄並拒絕猜測是否能重用部分產物。人工檢查後，確定尚未承接流量才能使用 `site-release.py stop-prepared --tag <tag>`，再使用新的 tag；不要自動重跑 migration/build。低階 `activate` 仍包含收斂，`cutover`/`converge` 供編排器分開呼叫；低階指令不會把 journal 標記完成。

Pages 和 verify 的 HTTP 請求都有 5 秒連線、20 秒總超時；guard/status 外部查詢有 90 秒界限。SIGINT/SIGTERM 會停止並等待當前子程序群組後釋放鎖。SIGKILL／斷電無法攔截，可能留下外部 Docker/Cloudflare 工作；遇此情況先確認原程序及外部操作已停止，再依 journal 與入口檢查恢復。Pages 上傳成功但 checkpoint 尚未寫入的極短中斷窗口可能重傳 Pages；收斂服務本身必須維持可重複執行的設計。

只有驗證成功並寫入 complete 後，auto 才執行 retire/prune。清理失敗維持既有警告行為，不回滾已驗證的發布；已完成版本重跑是 no-op，必要時可人工執行 prune。

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

- `WP_RELEASE_ROOT=$HOME/Desktop/write_project/releases`：正式入口掛載的靜態檔與發布控制資料。
- `WP_STUDIO_ENV_FILE=$HOME/Desktop/write_project/.env`：工作室建置需要的公開 Firebase 設定（不進 git）。

## 回滾

與手動發布相同：`python3 scripts/release/site-release.py rollback --tag auto-<sha>` 接回上一版入口；Cloudflare Pages 從部署記錄回滾。schema 遷移與身份收斂寫入的資料不會回滾，需要時從 `~/write_project_backups/` 的備份還原。

### 內容更新與程式發布的分工

`.github/workflows/content-refresh.yml` 提供每約 15 分鐘及手動的內容更新入口，與程式發布共用 `production-deploy` concurrency 和可信任 runner。2026-11-16 正常發布已留下 `complete` 紀錄，內容更新亦已成功完成；新環境仍須先正常發布一個包含新工具且紀錄為 `complete` 的版本。GitHub 排程可能延後，還要計入建置時間。

main checkout 只負責唯讀解析正式版本，真正建置使用該完整 SHA，避免帶入尚未發布的程式。內容流程持有發布、入口及 Pages 鎖，只有 Pages 產物與狀態紀錄會更新；不執行 API 切流、schema、身份收斂或清理。D1／R2 同步獨立運作。一般 `release.sh pages` 也使用共用 Pages 鎖、固定快照及新的輸出目錄，因此公開內容清空後仍可正常發布後續程式版本。狀態、重試、緊急下架與人工回滾注意事項見 [Pages 操作](public-pages-production.md#published-content-refresh)。
