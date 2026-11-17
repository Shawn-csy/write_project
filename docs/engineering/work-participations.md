# 作品參與關聯（第一、二階段）

目的：統一音聲目錄與外部作品集的身份關聯、讀取及新增流程。公開台本文稿與 Demo 保留各自的內容、授權及審核流程；它們不是音聲商品，不能為了統一參與關聯而轉成音聲商品。

## 共用契約

`services/work_participations.py` 是參與紀錄的讀寫入口。個人 API 的 `workParticipations` 每項包含 `id`、可空的 `audioWorkId`、`creditRole`、`creditedAs`、`title`、`url`、`coverUrl`、`workType`、`publishedAt`。支援職務為 `scriptwriter`、`voice_actor`、`post_production`、`cover_art`、`recording_studio`。

原始來源的 `author`／`script` 對應台本、`illustration`／`cover_art` 對應封面插畫、`recording` 對應錄音。保存原始 `sourceRole`，不從名字推導身份。跨平台同作尚無可靠識別時不自動合併。

- `PersonaCredit` 暫作明確的作品／身份／職務關聯；支援所有五種職務。
- `AudioWorkCredit` 保存來源署名，未確認身份也可保存；新投稿不會因名稱相同而自動認領。
- 舊 `PersonaCreditName` 已確認別名及 `voiceActorIds` 經共用讀取服務相容。新的審核結果優先於舊別名。
- `productionCredits` 暫留作舊客戶端相容欄位，由同一份參與資料過濾產生。
- 個人頁只輸出已核准目錄作品及允許公開的角色；來源署名公開不代表身份關聯可以公開。

## 新增與審核

`POST /api/public-audio-work-submissions` 可帶 `participants`，每項為 `role`、`creditedAs`、選填 `sourceUrl`／`sourceRole`。公開投稿不得指定 `personaId`。

管理員清單回傳 `participants` 與 `unresolvedParticipantCount`；`unresolvedOnly=true` 可查有未連結署名的作品。核准或更新時送入完整的 `participants` 清單，管理員可確認 `personaId`。未確認者仍保留署名。省略清單表示不改動；空清單表示清除支援職務。更新其他欄位不應重新猜測身份。

`replace_catalog_participants` 先驗證再修改，與作品審核狀態在同一交易提交。保留仍存在署名的原始來源證據；移除職務時同步移除身份關聯。舊聲演欄位更新經同一服務轉換。人工隱藏的角色不會因新增參與而被重新開啟。

所有職務個人頁的作品補充審核也使用 `record_participation`；身份收斂與既有社團匯入不再另建身份參與寫入邏輯。

## 匯入

新的批量關聯快照格式：

```json
{
  "works": [{
    "url": "https://example.com/work",
    "title": "作品名稱",
    "coverUrl": "https://example.com/cover.jpg",
    "workType": "audio",
    "participants": [{
      "role": "recording_studio",
      "personaId": "已在目標環境確認的身份ID",
      "creditedAs": "原始署名",
      "sourceUrl": "https://example.com/credits"
    }]
  }]
}
```

執行 `python -m scripts.import_work_participations snapshot.json --database-name write_project_dev` 預設回滾；加 `--apply` 才寫入。DB 名必須與環境相符。作品在目錄內時連結既有作品 ID；目錄外作品需已確認身份才可加入個人作品集。此工具只新增／更新傳入關聯，不以快照缺少項目為理由刪除既有關聯。

社團匯入腳本在提交前呼叫 `finalize_catalog_import(db, organization_id=...)` 或指定 `work_ids`，將已確認的舊身份關聯接到共用格式，並回報未連結署名。快照中的 `participants` 可傳已核對身份；`sourceCredits`／`credits` 的支援職務會保留為來源署名，複合署名不擅自拆人，其他職務仍保留給審核者參考。dry run 與 apply 都執行，且服務不自行 commit。來源研究腳本使用 `record_source_credit` 適配舊快照，不能跳過身份待核報告。

## 發布與第三階段邊界

本階段沒有新增 DB 表，也沒有全庫資料遷移。不能先部署移除名稱比對的前端、卻仍使用缺少 `workParticipations` 的舊後端／備援快照。

發布前先在測試環境匯入有明確身份證據的參與關聯，逐人比對舊台本作品與新輸出；未連結的舊台本署名必須在審核頁或經查核的快照中確認，不能以同名自動認領。風蓮已核對的 39 件台本身份關聯已整理成 `server/scripts/data/honglian_confirmed_participation_ids_2026-11-16.json`，供上述通用工具在目標環境預檢；本分支尚未執行正式寫入。其他作者仍需逐筆核對未連結項目。

正式發布應依序準備已確認關聯、更新後端、同步公開備援、確認 API，再更新前端。第三階段才進行全面去重、舊欄位淘汰與全庫遷移。

可重跑測試包含 `test_work_participations.py`、身份收斂／公開身份／作品審核契約，以及前端共用表單和個人頁測試。

Skill 的版控副本在 `docs/workflows/open-scripts-audio-catalog/SKILL.md`；本機啟用副本在 `~/.codex/skills/open-scripts-audio-catalog/SKILL.md`。

## 作者與聲演作品集（2026-11-17）

五種職務共用個人頁「新增參與作品」表單、`workParticipations` 輸出與作品卡片。提案送 `workFormat: "participation-v1"`；作者僅可送 `scriptwriter`、聲演僅可送 `voice_actor`，製作身份僅可送已公開職務。核准 `works` 欄位後由 `apply_profile_participations` 新增／更新，不用空清單清除其他作品。管理員和已認領聲演本人審核都走此入口。

舊聲演 `voiceActorWorks`／角色 profile 的 `works` 經相容層投影到同一份輸出；有網址者與目錄／明確關聯去重，無網址者保留獨立項目，不按標題猜同作。`characterName` 與 `description` 保留角色／說明；匯入快照的 participant 也可附帶這兩個欄位。新補充的資料以 role profile 的 `participationDetails[url]` 保存。待審或退回目錄不會透過舊作品集重新公開。舊版聲演提案沒有格式標記時仍維持原清單審核語義，避免把既有待審案誤當新增。

本文稿與 Demo 不轉為商品參與紀錄；它們保有閱讀、授權及播放流程。本次不刪舊欄位、不批量改寫正式資料。

## 公開列表與新增作品資料流

已核准音聲目錄作品的五種職務都以 `PersonaCredit` 的身份 ID 與職務讀取。公開投稿先保存未連結的 `AudioWorkCredit`；管理員確認身份後，`replace_catalog_participants` 建立關聯，`finalize_catalog_import` 接合既有作品集，然後失效 `public-bundle` 快取並重新驗證 `/authors`、`/resources`、相關 `/author/{id}`。批量匯入在同一交易中使用 `record_catalog_participant`／`finalize_catalog_import`，提交後也必須失效公開 bundle 與相關頁面快取。

`public._build_public_identity_context` 經 `participations_by_persona` 建立同一份角色作品資料；`_public_identity_projection` 輸出個人 API 與 bundle 的 `personas[].workParticipations`，`productionResources[].works` 只從相同投影篩出製作職務。公開站的資源列表依所選職務顯示這份資料。作者列表另從同一 bundle 的本站台本、外部公開台本及 `scriptwriter` 參與紀錄組成作品列；外部台本只依已確認的 `authorPersonaId` 或外部作者頁連結歸屬，不按顯示名稱猜測。作者個人頁仍保留本站／外部台本的原有閱讀入口，音聲台本參與由 `workParticipations` 顯示。

新增作品驗證應同時讀 `/api/public-personas/{id}` 與 `/api/public-bundle?sections=personas,productionResources`，確認各職務出現一次，重複匯入或審核後不增加副本。公開站靜態頁掛載時讀取即時 bundle；新增身份的個人網址由 404 shell 的 `LiveEntityRoute` 載入。未確認身份的來源署名保留在審核清單，不會憑名稱進入個人列表。

## 錄音身份分類與發布準備（2026-11-17）

`recording_studio` 是既有作品 credit 職務，不能用它推定承接者是個人或工作室。`PersonaRole.profile.entityType` 明確存 `person` 或 `studio`，`entityTypeSourceUrl` 記錄本人或官方核實來源。`productionResources[].recordingEntityType` 由相同身份投影輸出；公開目錄分列錄音師、錄音室及待分類錄音，沒有類型的舊資料留在待分類，不以姓名或品牌字樣猜測。作品關聯仍使用同一個 `recording_studio` 職務，不因分類更正移轉 credit；個人和工作室是獨立 Persona。

新資源投稿必填分類，審核舊 pending 投稿時管理員須補分類，否則回 400 並保持待審。新上架角色記錄分類與投稿的核實網址。既有身份可在管理端「新資源投稿審核 → 既有錄音身份分類」填來源並更正，API `GET /api/admin/recording-identities`、`PATCH /api/admin/recording-identities/{id}/entity-type` 均需管理權限；修改後失效 bundle 並重新驗證資源與個人頁。

首次發布前，用 `server/scripts/data/recording_entity_types_2026-11-17.json` 的逐人來源快照執行 `python -m scripts.backfill_recording_entity_types <snapshot> --database-name <目標DB>`。預設 dry run 與 rollback；核對目標環境 ID、來源和變更清單後才在已授權的發布流程加 `--apply`。此腳本只改角色 profile 分類，不寫 production credit。部署新版後端與公開站時，先完成回填、再讀 API 確認五筆分類及無待分類身份；同步備援 bundle 並重新驗證頁面。正式站尚未在本分支寫入。

海聶 7 件 CxC 作品封面另有來源核實快照 `server/scripts/data/haine_cxc_cover_overrides_2026-11-17.json`。其 work ID 與作品網址及封面網址逐筆對應；`scripts.backfill_external_covers` 預設 dry run，僅補空的 `coverUrlOverride`，有既有覆寫時會停止，避免覆蓋編輯。隔離預覽資料庫已回填並由公開 API 讀回 7/7；正式站尚未回填。正式流程需先核對正式資料 ID 和目前 cover，再透過外部台本管理入口或經批准的 dry-run／apply 腳本更新，失效公開 bundle、重新驗證作者頁與外部作品圖片，並同步備援。其餘 17 件 Google Docs 沒有核實可作作品封面的圖片，不以內文截圖填補。
