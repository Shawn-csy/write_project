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

---

## customMetadata 保留用途

`customMetadata` 是自由格式 key-value 陣列，保留用於：

1. **腳本創作 metadata**：只在劇本正文 parser / 讀者頁使用的欄位（`Outline`、`RoleSetting`、`BackgroundInfo`、`Synopsis`、`OpeningIntro`、`ChapterSettings`、`PerformanceInstruction`）
2. **活動 metadata**：`ActivityName`、`ActivityBanner`、`ActivityContent`、`ActivityDemoLinks`、`ActivityDemoUrl`、`ActivityWorkUrl`
3. **聯絡資訊**：`Contact`（自由格式或 JSON 物件）
4. **用戶自訂欄位**：任意 key-value（divider / text）
5. **legacy 讀取 fallback**：以下 reserved keys 僅讀不寫（見下節）

---

## Reserved Keys（禁止新增寫入）

以下 keys 過去曾寫入 customMetadata，現在由正式欄位取代。**新存檔流程不得產生這些 key**，僅保留讀取以相容舊資料。

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
| 4 | 命中率低後移除 legacy fallback read path | 待辦 |

---

## 注意事項（2026-05-26 更新）

- `Author` / `AuthorDisplayMode`：新寫入路徑已停止寫入 customMetadata，僅保留 legacy 讀取與 preserve 邏輯
- `LicenseCommercial` / `LicenseDerivative` / `LicenseNotify` / `LicenseSpecialTerms` / `LicenseTags`：新寫入路徑已停止寫入 customMetadata，僅保留 legacy 讀取
- `Series` / `SeriesOrder`：新寫入路徑已停止寫入 customMetadata，改由 `seriesId` / `seriesOrder` 正式欄位承載
