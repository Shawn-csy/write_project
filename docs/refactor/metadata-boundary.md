# Script Metadata Boundary RFC

## 目標

建立清晰的資料邊界：結構化欄位走正式 API 欄位，`customMetadata` 只存自由格式內容。消除雙軌寫入。

---

## 正式 API 欄位（Script）

以下欄位在 `scripts` 資料表有獨立欄位，並透過 API 正式輸出。存檔時必須走這些欄位，**不得再寫入 customMetadata**。

| 欄位 | 類型 | 說明 |
|------|------|------|
| `title` | string | 劇本標題 |
| `status` | string | `"Public"` / `"Private"` |
| `coverUrl` | string | 封面圖 URL（乾淨，無 hash） |
| `coverCrop` | `{cx, cy, zoom}` \| null | 封面裁切（結構化） |
| `draftDate` | string | 草稿日期 |
| `author` | string | 作者顯示名稱 |
| `personaId` | string \| null | 作者身份 |
| `organizationId` | string \| null | 所屬組織 |
| `seriesId` | string \| null | 所屬系列 |
| `seriesOrder` | number \| null | 系列排序 |
| `licenseCommercial` | string | `"allow"` / `"disallow"` / `""` |
| `licenseDerivative` | string | `"allow"` / `"disallow"` / `"limited"` / `""` |
| `licenseNotify` | string | `"required"` / `"not_required"` / `""` |
| `markerThemeId` | string \| null | 標記主題 |
| `disableCopy` | boolean | 停用複製 |
| `synopsis` | string \| null | 簡介（E1） |
| `outline` | string \| null | 大綱（E1） |
| `activityName` | string \| null | 活動名稱（E1） |
| `activityBannerUrl` | string \| null | 活動橫幅 URL（E1） |
| `activityContent` | string \| null | 活動說明（E6） |
| `activityWorkUrl` | string \| null | 作品連結（E6） |
| `activityDemoLinks` | string \| null | 示範連結 JSON string（E6） |

---

## customMetadata 保留用途

`customMetadata` 是自由格式 key-value 陣列，保留用於：

1. **腳本創作 metadata**：只在劇本正文 parser / 讀者頁使用的欄位（`RoleSetting`、`BackgroundInfo`、`OpeningIntro`、`ChapterSettings`、`PerformanceInstruction`）
2. **聯絡資訊**：`Contact`（自由格式或 JSON 物件）
3. **用戶自訂欄位**：任意 key-value（divider / text）
4. **legacy 保留 keys**：以下 reserved keys 不再讀寫，僅歷史資料保留（見下節）

---

## Reserved Keys（禁止讀寫）

以下 keys 過去曾寫入 customMetadata，現在由正式欄位取代。**新存檔流程不得產生這些 key，前後端也不再從中讀取**。舊資料中的這些 keys 為歷史殘留，不影響渲染。

```
Author
Authors
AuthorDisplayMode
LicenseCommercial
LicenseDerivative
LicenseNotify
LicenseSpecialTerms
LicenseTags
Series
SeriesOrder
marker_legend
show_legend
Synopsis
Outline
ActivityName
ActivityBanner
ActivityContent
ActivityWorkUrl
ActivityDemoLinks
ActivityDemoUrl
EventName
EventBanner
EventContent
EventWorkLink
EventDemoLinks
EventDemoLink
```

> 前端常數定義見 `src/lib/metadataBoundary.ts`

---

## 遷移策略

| Phase | 動作 | 狀態 |
|-------|------|------|
| 0（本文件）| 凍結邊界規範，定義 reserved keys | ✅ 完成 |
| 1 | Adapter 接管 hydration/save，統一 mapping 入口 | ✅ 完成 |
| 2 | save hook 瘦身，payload builder 純函式化 | ✅ 完成 |
| 3 | 停止把 reserved keys 寫入 customMetadata | ✅ 完成 |
| 4 | 移除 legacy fallback read path（synopsis/outline/activityName/activityBannerUrl）| ✅ 完成（E5） |
| 5 | 第二批升 schema：activityContent / activityWorkUrl / activityDemoLinks | ✅ 完成（E6） |
| 6 | 契約測試 + dead code 清理，metadata 單軌完成驗收 | ✅ 完成（E7/E8） |
| 7（可選）| 第三批升 schema（roleSetting / backgroundInfo / openingIntro 等）| 待辦 |

---

## 剩餘 customMetadata 欄位清單（合法寫入）

以下 keys 仍由 `buildCustomMetadataEntries` 寫入，無對應結構化欄位：

| Key | 說明 |
|-----|------|
| `RoleSetting` | 角色設定 |
| `BackgroundInfo` | 背景資訊 |
| `PerformanceInstruction` | 表演指示 |
| `OpeningIntro` | 開場介紹 |
| `ChapterSettings` | 章節設定 |
| `Contact` | 聯絡方式（自由格式或 JSON） |
| 用戶自訂 | 任意 key（divider / text），reserved keys 自動擋掉 |

---

## 防污染機制

- 前端 `buildCustomMetadataEntries`：`customFields` 寫入前經 `isReservedCustomKey()` 過濾
- 前端 `RESERVED_CUSTOM_KEYS`：`src/lib/metadataBoundary.ts`
- 後端：`create_script` / `update_script` 不再有任何 customMetadata → structured field 的反向填充

---

## Rollback Playbook（hotfix only）

若生產發現資料缺失（structured field 為 null 但 customMetadata 有舊 key），**臨時**恢復路徑：

**前端**（`fromApiToDraft`，custom read 區段末尾加回）：
```ts
draft.synopsis = draft.synopsis || String(meta.synopsis || meta.summary || "");
draft.outline = draft.outline || String(meta.outline || "");
draft.activityName = draft.activityName || String(meta.activityname || meta.eventname || "");
draft.activityBannerUrl = draft.activityBannerUrl || String(meta.activitybanner || meta.eventbanner || "");
draft.activityContent = draft.activityContent || String(meta.activitycontent || meta.eventcontent || "");
draft.activityWorkUrl = draft.activityWorkUrl || String(meta.activityworkurl || meta.eventworklink || "");
if (!draft.activityDemoLinks.length) {
  draft.activityDemoLinks = parseActivityDemoLinks(meta.activitydemolinks || meta.eventdemolinks);
}
```

**後端**（`scripts_command.py`，create/update 各自加回）：
```python
# In update_script, before setattr loop:
for col, keys in {
    "synopsis": ["synopsis","summary","description","notes"],
    "outline":  ["outline"],
    "activityName": ["activityname","eventname"],
    "activityBannerUrl": ["activitybanner","eventbanner"],
    "activityContent": ["activitycontent","eventcontent"],
    "activityWorkUrl": ["activityworkurl","eventworklink"],
    "activityDemoLinks": ["activitydemolinks","eventdemolinks"],
}.items():
    if col not in update_data:
        meta_map = {str(i.get("key") or "").strip().lower().replace(" ",""): str(i.get("value") or "")
                    for i in (update_data.get("customMetadata") or []) if isinstance(i, dict)}
        for k in keys:
            val = meta_map.get(k,"").strip()
            if val: update_data[col] = val; break
```

> 恢復後儘快排程 migration backfill 再移除 hotfix。

---

## 注意事項（2026-05-26 更新）

- `Author` / `AuthorDisplayMode`：新寫入路徑已停止寫入 customMetadata，僅保留 legacy 讀取與 preserve 邏輯
- `LicenseCommercial` / `LicenseDerivative` / `LicenseNotify` / `LicenseSpecialTerms` / `LicenseTags`：新寫入路徑已停止寫入 customMetadata，僅保留 legacy 讀取
- `Series` / `SeriesOrder`：改由 `seriesId` / `seriesOrder` 正式欄位承載
- `Synopsis` / `Outline` / `ActivityName` / `ActivityBanner`（E5）、`ActivityContent` / `ActivityWorkUrl` / `ActivityDemoLinks`（E6）：前後端均直接使用結構化欄位，不讀不寫 customMetadata
- **契約測試**：`src/lib/metadataContract.test.ts`（前端 42 條）、`server/tests/test_metadata_contract.py`（後端 22 條）
