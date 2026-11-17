---
name: open-scripts-audio-catalog
description: 建立或更新 Open Scripts「音聲作品」中的社團、參與者職務與外部販售作品目錄。使用者提供工作室官網、DLsite、CxC 或買動漫並要求收錄作品時使用；台本匯入與 Demo 連結另用對應 skill。
---

# Open Scripts 音聲作品建檔

目標是讓 `/audio-works` 依組織展示已查核的音聲作品，卡片連到每件作品的原始頁。不要把販售音聲當成「外部公開台本」匯入。本站只保存展示資訊，不複製付費內容。

## 確認範圍與來源

- 依使用者指定的工作室、平台、作品範圍與目標環境處理。若說「新增這家」並提供官網完整列表，可收錄官網可核對的音聲；預購、周邊、遊戲與免費試聽要分辨，不能只憑首頁按鈕當成已發售音聲。未指定正式站時，沿用目前任務已建立的環境脈絡；在回報中明說實際寫入哪個環境。
- 從官方網站、社團頁與每筆商品頁核對標題、作品網址、封面、販售狀態、免費／付費、台本／聲演／後製／封面插畫／錄音等來源列出的參與職務、成人標示與發售日期。短網址要解析到商品 ID；以商品 ID 或 canonical URL 查重，同作品跨平台販售時依使用者範圍判斷是否合併，避免重複卡片。來源不支持的聲演、成人分級或日期留空，不猜測。
- 官網聲稱有完整列表時，先列出其中的作品與購買連結，再逐筆核對可存取的商品頁；比對最終收錄數與官網中符合範圍的項目數，記錄排除原因。商品頁無法讀取時，只使用官網直接證實的欄位，將其餘資訊標為待核。移除追蹤參數後保留穩定的單件商品網址。
- 優先保留可用的直接商品網址與來源封面。作品頁、社團頁、官網、X 各有不同用途；不能用社團首頁代替單件作品的購買連結。頭像與作品封面不可互用。保留來源清單或快照與查核日期，讓後續可重查。

## 寫入 Open Scripts

- 先讀目前程式與資料契約，尤其是 `server/models.py` 的 `Organization`、`Persona`、`PersonaRole`、`PublicAudioWorkSubmission`，以及 `server/routers/public_bundle.py`、`apps/public/app/audio-works/AudioWorksClient.tsx`。可參考 `server/scripts/import_purelysilkvoice_audio.py`、`import_cxc_bedtime_catalog.py` 等既有匯入程式，但不要照抄其中的社團 ID、資料筆數、平台 owner 或成人標示。
- 單筆或少量資料可用現有管理介面／API；批量 Dev 匯入可建立經查核的 JSON 快照與可重跑的匯入程式。執行前依商品 ID／URL、組織名稱與聲演身份查重。遇到同名但無法確認是同一人的聲演，先保留文字 credit，不任意合併身份。
- 批量快照至少記錄來源網址、查核日期、社團資訊及每筆作品的標題、直接購買網址與可證實的欄位；匯入程式的筆數檢查依該次快照決定，不把先前社團的數量或商品分類寫成通用規則。
- 組織需有目前環境有效的 `ownerId`，公開 API 才能序列化。用現有平台管理身份須確認它在目標環境存在，不將其他社團的 owner 或固定 UUID 視為通用值。已存在的組織／作品若屬人工管理，避免無條件覆寫；匯入需可安全重跑。
- `createdAt`、`reviewedAt` 與 `publishedAt` 語意不同。只有來源證實發售日才填 `publishedAt`，並按來源時區轉成毫秒 Unix 時間。`status=approved` 會公開，需有使用者新增／刊登授權；僅要求整理或預覽時不要核准或寫入。目標是 Dev 時，程式要拒絕非 Dev 資料庫；正式站變更遵循該環境既有發布流程。
- 官網與社群連結若要顯示在組織頁，檢查當前 UI 如何取得連結；完成資料寫入不代表這些連結自動出現。只修改相關頁面與資料，不覆蓋工作區其他人的改動。

## 作品參與關聯

- 先讀專案的 `docs/engineering/work-participations.md` 與 `server/services/work_participations.py`，確認目標後端已支援這份契約。新增作品與補作品集都使用共用服務；不要另建按創作者姓名特判的關聯邏輯，也不要只填 `voiceActorIds` 就視為參與資料完整。
- 每筆已查核的署名記錄 `role`、原始 `creditedAs`、`sourceUrl`。身份已確認時填目標環境的 `personaId`；改名、別名、同名都不能只靠顯示名稱自動合併。無法確認身份時保留文字署名，列入未連結報告，不猜 ID、不為消除提示而建立身份。來源未列出某職務不代表沒有參與，也不能自行推定參與。
- 目錄作品使用 `record_catalog_participant`；目錄外且已確認身份的作品使用 `record_participation`。少量操作可用作品審核頁的「參與者與職務」；批量關聯使用 `python -m scripts.import_work_participations <snapshot> --database-name <目標DB>`，預設 dry run，獲得本次寫入授權後才加 `--apply`。既有社團匯入腳本需在同一交易內呼叫 `finalize_catalog_import`，限定本次組織或作品 IDs，回報新關聯與未連結署名。
- 共用輸出是個人頁的 `workParticipations`。台本、聲演、後製、封面、錄音以身份 ID 關聯，顯示分區由職務決定。`AudioWorkCredit` 是來源署名、`PersonaCredit` 是身份關聯，舊表暫時保留是相容層；不要直接繞過共用服務寫入身份關聯。
- 寫入後核對每個已確認參與者的個人頁 API 與 `/api/public-bundle?sections=personas,productionResources`：每件作品對應的職務、原始署名、連結均正確，作者列表、所屬職務的資源列表及個人頁各顯示一次；重跑匯入後件數不增加。待審／退回作品及隱藏角色不出現在公開參與作品。管理員清單的「只顯示尚未連結身份的作品」用來追蹤剩餘缺口。回報作品數與職務關聯數時分開計算，同件作品可有多種職務。

- 作者、聲演與製作身份的外部參與作品皆使用上述共用入口；不要再新增 `voiceActorWorks` 清單作為新作品的主要儲存。個人資料補充使用 `workFormat: "participation-v1"`，核准後新增／更新參與關聯。聲演角色與說明以 `characterName`／`description` 保留；舊清單由相容層讀取，無連結項目不可按標題合併。

## 錄音師與錄音室

- 來源 credit 的 `recording` 仍對應 `recording_studio` 參與職務；承接者類型另存在 `PersonaRole.profile.entityType`，只允許 `person` 或 `studio`。不要依名稱有無「工作室」或僅憑提供錄音服務推定類型，不要把個人與其品牌身份合併或移轉既有作品。
- 新資源投稿要明確選個人錄音師或錄音室／工作室；管理員審核舊待審投稿也要補分類，並核實官方或本人來源。既有身份可在管理端「既有錄音身份分類」更正，填入可核實的 `entityTypeSourceUrl`。未確認的舊身份保留在待分類錄音目錄，不要默默排除。
- 發布前讀 `docs/engineering/work-participations.md` 的來源快照、dry run／回填步驟；確認 bundle 的 `recordingEntityType`、錄音師與錄音室分列、作品信用關聯仍各自正確。分類更正後須刷新公開 bundle、資源和個人頁及備援快照。

## 驗證與回報

- 寫入前跑 dry run；確認來源網址與封面可開啟。寫入後再跑一次查重／dry run，應為零新增。讀回資料庫與 `/api/public-bundle`，核對組織、作品數、`approved` 狀態、聲演連結、圖片及每筆購買網址。若 bundle 出錯，查 API 日誌並修正根因。
- 開目標環境的 `/audio-works` 檢查組織卡、作品卡、官方連結與外部商品連結。靜態部署或快取可能讓 DB 更新尚未出現在頁面；依實際服務路徑同步或重新驗證後再說已上線。
- 回報實際收錄數、資料來源、寫入環境、驗證結果與尚未完成的發布步驟。不要輸出密鑰、連線字串或 `.env` 內容。
