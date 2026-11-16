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

製作人個人頁的作品補充審核也使用 `record_participation`；身份收斂與既有社團匯入不再另建身份參與寫入邏輯。

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
