# 架構維護分階段路線圖

更新：2026-11-13。這是待辦與驗收範圍，不宣稱全部完成，也不代表線上狀態檢查。現況由 [前端邊界](../architecture/frontend-boundaries.md)、[資料庫架構](../engineering/database-architecture-current.md) 與 [發布程序](../engineering/continuous-deployment.md) 說明。

| 階段／狀態 | 範圍 | 驗收條件 |
|---|---|---|
| 1. CI 與 release reliability（首批已本機驗收，未部署） | 已補 CI 觸發範圍、工作室檢查、具名 CI 閘門、發布 journal 與切流後續跑；保持網站入口切換與 DB 維護分離 | 必要工作有明確成功條件，缺失／失敗不能發布；切流後的 Pages／驗證失敗可定位並依程序重試；切流前的部分建置失敗須拒絕繼續並人工檢查，不能宣稱所有步驟可自動重試；回滾範圍清楚，本機檢查與整合證據經 review |
| 2. 內容驅動 Pages refresh 與來源新鮮度（首批已本機驗收，未部署） | 公開內容變動觸發 SEO 快照重建；合併重複事件，追蹤建置來源與 D1/R2 同步新鮮度 | 新增／更新／撤下內容可在重建後反映於 HTML、metadata、sitemap；失敗可見且可重試；瀏覽器 live API 與建置快照時間可區別；不存在路徑維持正確語意 |
| 3. route／UI feature boundaries（待辦） | route 僅負責組裝、URL／metadata／資料 adapter；依功能整理 UI 與 model，先選一個 discovery／目錄模組作示例，再決定擴張 | 示例的 route、feature UI、pure model 與 shared package 責任清楚；不新增跨 app 反向 imports；既有 URL、SEO、loading／error／empty 行為與工作室預覽通過適當驗證；示例尚未實作 |
| 4. versioned migrations 與 restores（待辦） | 從目前 legacy migration 建立有版本、可追蹤的變更流程，定義 backup／restore 及資料回復與程式回滾的差異 | 空庫升級與既有資料升級均可重現；失敗、重跑與並發控制有驗證；隔離環境可從備份還原並檢查資料／schema／readiness；有可操作的復原程序，不把映像回滾當資料回滾 |

第 1 階段仍待候選預建置與不可變 release manifest 的設計及驗收；本次可靠性修正不代表這些能力已完成。2026-11-13 本機驗收：前端 2,522 項測試、根目錄與公開站型別檢查、工作室建置、fixture 驅動的公開站 standalone／Pages 雙建置，以及發布／CI 契約檢查通過。發布故障測試使用隔離假指令，不代表正式環境切流演練已完成。

逐階段交付與 review；第 1 階段完成不代表後續階段完成。任何正式部署、同步、遷移或 restore 的實際結果須另外留下當次證據。

### 第二階段驗收紀錄

2026-11-13 已實作內容排程／手動入口、固定快照建置、正式 commit 綁定、內容指紋及可重試狀態紀錄。實際建置通過新增、修改、下架與公開目錄完全清空；故障測試涵蓋建置／上傳／驗證失敗、入口與版本不符、並行鎖、公開版本被替換及內容變動。未部署正式環境，也未宣稱排程已線上運作。

本階段採每約 15 分鐘偵測公開資料，會合併期間的修改；建置途中資料改變會延後再試。D1／R2 仍獨立同步。剩餘限制是排程延後與建置耗時，以及公開 API 多次讀取並非交易快照；即時發布事件／outbox、對外新鮮度狀態介面與備援同步監測仍待後續階段。操作與重試見 [Pages 操作](../engineering/public-pages-production.md#published-content-refresh)。
