# 架構維護分階段路線圖

更新：2026-11-16。現行部署與資料路徑以 [正式環境架構](../architecture/production-architecture.md) 為準；本頁區分已實作／啟用與仍待完成的工作。2026-11-13 的本機驗收紀錄不等於當時已部署；下列狀態納入 PR #48、#49 合併後的正式啟用證據。

| 階段／狀態 | 已交付範圍 | 剩餘驗收與限制 |
|---|---|---|
| 1. CI 與 release reliability（已部署） | main 的兩個指定 CI workflow 通過後，由 Mac self-hosted runner 執行 API／Studio candidate、schema 檢查、切流、converge、Pages 建置／上傳／驗證及完整 journal | API／edge 直接回滾與 Pages 回滾各自處理；程式回滾不回滾資料庫。不得把部分完成或 journal 不完整當發布完成 |
| 2. 內容驅動 Pages refresh 與來源新鮮度（已部署／排程啟用） | 固定正式 deployed SHA、擷取來源、建置、再次擷取比對、上傳、驗證及狀態 receipt；GitHub cron 每小時 7、22、37、52 分執行，約 15 分鐘檢查一次；D1／R2 另由 launchd 每 900 秒同步 | 排程可能延後，建置中內容改變會延後再試；不是 webhook 或即時發布事件。API 多次讀取不是資料庫交易快照。網站級 receipt 不等於每件作品的發布證明；事件推送／outbox、對外新鮮度 UI 仍待辦 |
| 3. route／UI feature boundaries（待辦） | 依功能整理 UI、model 與 route adapter 的方向維持 | 先選一個 discovery／目錄示例，驗證 URL、SEO、loading／error／empty 與工作室預覽；不新增跨 app 反向 imports，示例尚未完成 |
| 4. versioned migrations 與 restores（備份／還原已啟用，版本化流程仍待辦） | 每日 04:00 Asia/Taipei 執行 PostgreSQL custom dump、媒體與 hash manifest；本機保留 14 日，外接 Horcrux 不同掛載檔案系統保留 180 日；隔離還原驗證 40 表、2,375 筆與 208 個媒體通過 | 仍需完善版本化 migration 的空庫／既有資料升級、並發與重跑治理；DB dump 與媒體不是共同原子快照。外接備份不是異地備份；Mac 仍為寫入單點 |

## 正式啟用與證據

- 正式程式版本：`6b32f07`（2026-11-16）。[正式發布 workflow](https://github.com/Shawn-csy/write_project/actions/runs/43798799241) 與 [內容 refresh workflow](https://github.com/Shawn-csy/write_project/actions/runs/43799579143) 分別記錄程式發布與內容快照重建。
- D1／R2 同步已由獨立於 checkout 的不可變 ops runtime 執行；監測 launchd 每 300 秒檢查 API／圖片延遲、有限 Nginx 媒體錯誤樣本、Pages／同步新鮮度與磁碟，使用本機日誌及 exit code，沒有新增 email／Slack 告警服務。
- 備份外接鏡像失敗時保留本機備份並以非零狀態退出；完整復原與程式回滾分開處理。

公開站是 Next.js 靜態建置輸出加瀏覽器 live API，不把 Next server／ISR 當正式環境後續必備元件。Ci-en／Bedtime 爬蟲仍為獨立 CLI，沒有排程或自動發布；不宣稱支援 X 爬蟲。

內容 refresh 的操作與重試見 [Pages 操作](../engineering/public-pages-production.md#published-content-refresh)。逐階段交付與 review；任一階段完成不代表所有維護工作已完成。
