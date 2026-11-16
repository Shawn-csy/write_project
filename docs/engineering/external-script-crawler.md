# 外部公開台本探索工作

這是可重複執行的後端 CLI，不是聊天代理臨時爬取。只讀應用程式資料庫，將來源狀態、執行紀錄與待人工核對候選寫入**獨立 SQLite 工作狀態檔**。正式台本資料仍由 PostgreSQL 管理；不修改目錄、不下載全文、不自動刊登，也不推論作品作者。

## 執行環境與命令

使用服務現有 Python 環境與 requirements（SQLAlchemy 已存在），沒有新增套件。從 repository 根目錄執行；若獨立 worktree 沒有 venv，使用原 checkout 的絕對 Python 路徑，例如 `/Users/shanti/Desktop/write_project/server/venv/bin/python`。

```sh
server/venv/bin/python server/scripts/crawl_external_scripts.py run --state /data/external-script-crawler.sqlite
server/venv/bin/python server/scripts/crawl_external_scripts.py status --state /data/external-script-crawler.sqlite
server/venv/bin/python server/scripts/crawl_external_scripts.py results --state /data/external-script-crawler.sqlite
```

預設使用現有 `DATABASE_URL` / `DB_PATH` 和 SQLAlchemy Session，查詢所有狀態的 source/canonical 作去重，僅 published 項目的來源參與探索。Session 設為唯讀交易；沒有應用資料提交。`--state` 或 `EXTERNAL_SCRIPT_CRAWLER_STATE` 指定獨立檔案，預設在 `DB_PATH` 同目錄；必須是持久且可寫的掛載。禁止和主資料庫共用檔案。

不接觸主資料庫的公開實測（bundle 只提供 seeds，同一套 crawler 處理）：

```sh
server/venv/bin/python server/scripts/crawl_external_scripts.py run --public-bundle-url 'https://api-open-scripts.shawnup.com/api/public-bundle?sections=externalPublicScripts' --state /tmp/crawler-smoke.sqlite --max-pages 40 --max-seconds 90
server/venv/bin/python server/scripts/crawl_external_scripts.py results --state /tmp/crawler-smoke.sqlite
```

所有命令輸出 JSON。`run` 包含新增候選記錄數 `new_candidates`（含已收錄匹配、文章、資料夾），`known_matches`、`unindexed_work_candidates` 與各 kind 計數。**首次 baseline 的未收錄候選不代表剛發表作品**。結果的 `verification_status=unverified_external_link`、`title_source=listing_anchor_or_nearby_heading`、`publication_status=unknown` 明示尚未核對。標題可能只是集合標題或別版標籤；未收錄 URL 也可能是已收錄文章的另一個 Google 文件版本，不能當成新增作品。`first_seen` 是系統首次看到，不是作品發布日期。重跑同一候選不新增記錄，會更新 last_seen、URL、標題及目前目錄匹配；證據保留實際來源頁與原始儲存作者/組織資訊，不代表證實該連結作品的作者。

## 目前涵蓋範圍

- `bedtimestoryasmr.com` 首頁 → `/page/freedownload`，從 HTML anchors/heading 抽出 Google 文件；Google folder 為 `collection`，不是作品。
- `ci-en.dlsite.com/creator/{id}`：由儲存文章推導 creator、追蹤同 creator 文章列表與 `page` 分頁，再從文章抽出文件。文章本身為 `article`，文件為 `work`，兩者分開。每來源最多 12 頁，深度預設 3；超限明確標為 `truncated`。
- Google 單一文件不能列舉作者全部作品；X 時間軸、CXC JS 頁面及其他網址均為 `unsupported`。不宣稱所有平台都支援。

Google Docs/Drive file 以同一 file ID 去重（忽略 query/fragment）；X status、Ci-en article 及 CXC work/item（locale 忽略，reader ID 保留）有穩定 identity。現有 sourceUrl 與 canonicalUrl 都參與比對。文章或資料夾不會自動成為台本。

來源 `error`、`truncated` 或 unsupported 均不刪除候選、不宣告作品下架，下次會重試。較早嘗試的來源優先，避免全域預算一直偏向單一 creator。`completed` 表示可嘗試來源處理完畢，仍可能包含 unsupported；請讀 source_statuses。支援頁若缺少預期列表/作品連結會報錯，不能以導覽列判定成功零作品。

## 安全與執行上限

只請求固定 HTTPS 主機白名單，禁止 credentials、自訂 ports。每次 redirect 同樣檢查白名單/公開 DNS，最多 4 次。沿用既有 DNS pinned HTTPS transport、停用環境 proxy；所有解析地址必須是公開 IP，TLS SNI 與憑證仍用原 hostname。Google 等候選連結僅記錄、不抓取。固定 public bundle endpoint 只供讀取 seeds。

預設全域 40 requests（含 redirects/bundle）、每回應 2 MiB、socket timeout 8 秒、主機間隔至少 0.5 秒、120 秒合作式時間預算。DNS resolver 本身與慢速 socket 讀取不能保證硬性 wall-clock deadline；部署可用外部 timeout 做最後界線。上限造成 partial/truncated，HTTP/格式錯誤保留來源錯誤。候選只保存短標題與 provenance，不保存台本或文章本文。

## 單一排程範例（需要部署者手動啟用）

不要在 FastAPI 每個 worker 安裝 scheduler。由一個主機 cron 執行下列工作；容器的 `/app` 是 server 目錄，`/data` 為持久掛載。範例沒有在本次實作中安裝：

```cron
17 */6 * * * docker exec -e EXTERNAL_SCRIPT_CRAWLER_STATE=/data/external-script-crawler.sqlite open-scripts-api timeout 180 python /app/scripts/crawl_external_scripts.py run >> /var/log/open-scripts-crawler.jsonl 2>&1
```

容器名稱與 timeout 可用性須按部署確認。程序使用 state 旁的 `.lock` 非阻塞 flock，防止同一 state 重疊；狀態 volume 與 lock 應在同一個持久磁碟。不要同時啟用多份 cron。中止中的 run 會保留 running 紀錄供辨識，下次仍可重新執行。CLI seed 載入失敗也記錄 failed run；status/results 不載入應用 DB。

測試：

```sh
server/venv/bin/python -m unittest discover -s server/tests -p 'test_external_script_crawler*.py' -v
```

## 本次驗收（2026-11-16）

將公開 API 的 125 筆外部台本連結放入拋棄式本機資料庫，實際由 CLI 的預設資料庫路徑連跑兩次；主資料庫檔案 SHA-256 前後一致。結果保存 38 個文件入口、11 篇文章、1 個資料夾；第二次新增候選數為 0。5 個文件 URL 未匹配目錄，仍標記未核對，其中可能是既有作品的其他入口，不代表 5 篇新發表作品。

被談聲聆列表成功；Ci-en 達每來源 12 頁上限，狀態為 `truncated`，整體為 `partial`。其他 139 個來源網址標記 `unsupported`（數量包含個別文件與作者頁，不等於作者人數）。這是有界探索驗收，不是全平台完整掃描。

34 項測試通過：14 項爬蟲／CLI 測試與 20 項既有 metadata 安全測試。涵蓋下一次新增文章與文件、重跑去重、狀態查詢不連主資料庫、失敗紀錄、跨程序鎖定、來源錯誤與 URL 安全。正式環境尚未部署或安裝排程。
