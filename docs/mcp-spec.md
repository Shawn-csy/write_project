# MCP Server 規格文件

## 概覽

為 write_project 設計一個 MCP (Model Context Protocol) server，讓用戶的 AI agent 能夠讀取並更新劇本 metadata，無需手動複製貼上。

**核心使用情境：** 用戶讓 agent 讀取劇本內容 → 自動生成並填入 synopsis、outline、tags、license 等欄位 → 直接存回網站。

---

## 架構

```
write_project/
├── server/
│   ├── mcp_server/          ← 新增
│   │   ├── server.py        ← MCP server 主程式
│   │   ├── tools.py         ← MCP tools 定義
│   │   ├── auth.py          ← API key 驗證
│   │   └── requirements.txt
│   ├── routers/
│   │   └── api_keys.py      ← 新增：API key 管理端點
│   ├── models.py            ← 新增 ApiKey model
│   ├── schemas.py           ← 新增 ApiKey schemas
│   └── docker-compose.yml   ← 新增 mcp service
```

---

## 認證機制：Personal API Key

### 流程
1. 用戶在網頁 Settings 生成 API Key
2. 複製 key（**只顯示一次**，存 SHA-256 hash）
3. 貼到 MCP client config（Claude Desktop / Cursor 等）
4. Agent 每次呼叫自動帶上 key
5. MCP server 驗證 key → 查出 ownerId → 只能操作自己的資料

### MCP Client Config 範例
```json
{
  "mcpServers": {
    "write-project": {
      "url": "https://yoursite.com/mcp/sse",
      "headers": {
        "X-API-Key": "wp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

---

## DB 變更

### 新增 `api_keys` 表

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | String (UUID) | PK |
| `ownerId` | String | FK → users.id |
| `name` | String | 用戶自訂名稱（如「My Claude」） |
| `keyHash` | String | SHA-256(key)，唯一索引 |
| `keyPrefix` | String | key 前 8 碼，用於 UI 顯示 |
| `createdAt` | Integer | Unix timestamp |
| `lastUsedAt` | Integer | 最後使用時間，nullable |
| `isActive` | Boolean | revoke 用 |

### Key 格式
```
wp_{secrets.token_urlsafe(32)}
```
長度 ~46 字元，256-bit entropy，無法暴力破解。

---

## 後端 API 端點（新增）

### `GET /api-keys`
列出當前用戶所有 API keys（不回傳 keyHash，只回傳 prefix + name + lastUsedAt）

### `POST /api-keys`
生成新 key
- Body: `{ "name": "My Claude" }`
- Response: `{ "id": "...", "key": "wp_xxx..." }` ← **唯一一次回傳完整 key**

### `DELETE /api-keys/{key_id}`
Revoke（設 isActive=False）

---

## MCP Server

### 技術選型
- Python（同後端語言）
- `mcp` SDK (`pip install mcp`)
- 直接 import 後端 `crud_ops`、`database`、`schemas`（不走 HTTP，直接操作 DB）
- 傳輸協議：SSE（Server-Sent Events），支援遠端連線

### 運行方式
獨立 docker service，port 8000，掛在同一個 docker-compose network。

---

## MCP Tools 規格

### 1. `list_scripts`
**描述：** 列出用戶所有劇本（不含內容）

**參數：**
- `folder` (optional, string) — 篩選資料夾路徑
- `status` (optional, string) — 篩選狀態："Private" | "Public" | "Unlisted"

**回傳：**
```json
[
  {
    "id": "...",
    "title": "...",
    "status": "Private",
    "folder": "/",
    "synopsis": "...",
    "tags": [...],
    "seriesId": "...",
    "lastModified": 1234567890,
    "hasSynopsis": false,
    "hasOutline": false
  }
]
```

---

### 2. `get_script`
**描述：** 讀取單一劇本完整資料（含內容）

**參數：**
- `script_id` (required, string)

**回傳：** 完整 Script 物件，含 content、所有 metadata 欄位、tags、series

---

### 3. `update_metadata`
**描述：** 更新劇本 metadata（不含 content）

**參數（皆 optional）：**
- `script_id` (required, string)
- `title` (string)
- `author` (string)
- `synopsis` (string)
- `outline` (string)
- `draftDate` (string)
- `seriesId` (string)
- `seriesOrder` (int)
- `licenseCommercial` (string) — "allowed" | "prohibited" | "contact"
- `licenseDerivative` (string) — "allowed" | "prohibited" | "contact"
- `licenseNotify` (string) — "required" | "not_required"
- `activityName` (string)
- `activityContent` (string)
- `activityWorkUrl` (string)
- `customMetadata` (array)

**不開放：**
- `content` — 劇本本文，只能透過網頁編輯器修改
- `coverUrl` — 圖片需透過 UI 上傳

**安全機制：** 修改前將現有 metadata 快照寫入 `script_history` 表。

---

### 4. `set_publish_status`
**描述：** 設定劇本發布狀態

**參數：**
- `script_id` (required, string)
- `status` (required, string) — "Private" | "Public" | "Unlisted"

---

### 5. `list_tags`
**描述：** 列出用戶所有可用 tags

**回傳：**
```json
[{ "id": 1, "name": "奇幻", "color": "bg-purple-500" }]
```

---

### 6. `attach_tag`
**描述：** 為劇本加上 tag

**參數：**
- `script_id` (required, string)
- `tag_id` (required, int)

---

### 7. `remove_tag`
**描述：** 移除劇本的 tag

**參數：**
- `script_id` (required, string)
- `tag_id` (required, int)

---

### 8. `list_series`
**描述：** 列出用戶所有系列

**回傳：**
```json
[{ "id": "...", "name": "...", "summary": "...", "scriptCount": 3 }]
```

---

## 不開放的操作（MCP 禁止）

| 操作 | 原因 |
|---|---|
| 修改劇本本文 content | 防止 agent 誤覆寫創作內容 |
| 刪除劇本 | 不可逆 |
| 刪除系列 / tag | 影響其他劇本 |
| 上傳封面圖片 | 需 UI 處理 |
| 轉移劇本所有權 | 高風險操作 |

---

## 歷史紀錄機制（新增 `script_history` 表）

每次 `update_metadata` 執行前，自動快照當前 metadata。

| 欄位 | 型別 |
|---|---|
| `id` | String (UUID) |
| `scriptId` | String |
| `ownerId` | String |
| `changedBy` | String — "mcp" \| "user" |
| `snapshotMetadata` | JSON String |
| `createdAt` | Integer |

保留最近 20 筆，自動清理舊紀錄。

---

## 前端變更

### Settings 頁面新增 API Key 管理區塊

- 顯示現有 keys（name + prefix + lastUsedAt + revoke 按鈕）
- 生成新 key 表單（輸入名稱 → 生成 → 顯示完整 key 一次 + 複製按鈕）
- 警告文字：「Key 只顯示一次，請立即複製保存」

---

## Docker Compose 變更

```yaml
services:
  api:
    # 現有設定不變

  mcp:
    build: ./mcp_server
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - DB_PATH=/data/scripts.db
      - MCP_PORT=8000
    volumes:
      - ./data:/data
      - ./:/app/server  # 共享後端 code
    depends_on:
      - api
    restart: unless-stopped
```

---

## 實作順序

1. **DB** — 新增 `api_keys` 表、`script_history` 表（`models.py` + migration）
2. **後端** — `schemas.py` 新增 ApiKey schemas、`routers/api_keys.py`、註冊到 `main.py`
3. **MCP server** — `mcp_server/` 目錄，auth + tools + server
4. **Docker** — 加 mcp service
5. **前端** — Settings 頁加 API Key 管理 UI
6. **測試** — 用 Claude Desktop 連線測試

---

## 後續可擴充（不在本次範圍）

- OAuth 2.0 flow（讓第三方 AI 平台直接整合）
- Webhook：metadata 更新後通知外部服務
- `create_tag` tool
- `create_series` tool
- 批量 metadata 更新（`batch_update_metadata`）
