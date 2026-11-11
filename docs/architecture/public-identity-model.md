# 公開身份模型：一人一頁

最後更新：2026-11-11

## 規則

每一位公開出現在站上的人（台本師、聲演、後製、封面、錄音室，以及外部匯入的台本作者）都是一筆 `Persona`，只有一個公開頁 `/author/<personaId>`。身份不是頁面種類，而是 `PersonaRole`：

| role | 頁面區塊 |
|---|---|
| `scriptwriter` | 系列作品、台本作品（站內＋外部） |
| `voice_actor` | 參與演出、音聲作品、參演作品 |
| `post_production` | 後製作品 |
| `cover_art` | 封面作品 |
| `recording_studio` | 錄音作品 |

頁首（頭像、名稱、身份標籤、介紹、聯絡方式、修改紀錄）全部共用。區塊依 `apps/public/app/author/[id]/AuthorPageClient.tsx` 的 `SECTIONS` 清單決定：身份符合、而且有內容才顯示。新增身份只需要在後端加 role、在 `SECTIONS` 加一筆。

## 資料來源

- **製作參與**：`persona_credits`（審核過的參與，指向音聲目錄作品或站外作品）＋ 目錄匯入的 `audio_work_credits`。後者只記錄印在作品上的名字，由 `persona_credit_names`（role + 署名 → persona）決定是哪個人；拼法變體（`TAKA` / `Taka`）指到同一人。
- **外部台本作者**：`external_authors.linkedPersonaId` 指向身份；有公開作品的外部作者一定有身份，`/author/external/*` 會導向身份頁。
- **舊的製作資源**：`production_resources.personaId` 記錄它被哪個身份取代，`production_resource_*` 其他表只保留作為搬遷來源。舊網址 `/resources/<id>`（包含自動產生的 `credit-…`）以 308 導向身份頁；對照表在 bundle 的 `productionResources[].legacyIds`。

## 收斂（convergence）

`server/services/identity_convergence.py` 把上述來源併入身份，具冪等性，會在：

- API 啟動時（僅限開發環境：`DB_RUN_IDENTITY_CONVERGENCE` 預設跟隨 `DB_RUN_LEGACY_MIGRATIONS`，正式環境為 0；正式環境由 `scripts/release.sh activate` 在切流後執行）
- 核准音聲作品、建立／更新外部台本、各匯入腳本完成後

自動執行。名字只有在**恰好對到一個**既有身份時才合併，同名多人時一律另建新身份。上線前可先預覽：

```bash
python -m services.identity_convergence --dry-run
```

會列出新建的身份與合併進既有身份的名字。

## 資料補充（編輯）

所有身份共用同一個表單（`components/identity/IdentityProfileForm.tsx`）與同一個審核端點 `POST /api/voice-actor-profile-submissions`，以 `profileKind` 區分：`author`、`voice_actor`、`production`。`production` 送出的作品在核准後**新增**為 `persona_credits`，不會覆蓋既有參與。後台統一在「個人頁面審核」。

`/api/external-author-profile-submissions` 仍保留給舊頁面相容，新頁面不再使用。
