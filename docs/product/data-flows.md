# 核心與功能資料流（檔案到檔案）
最後更新：2026-05-14

本文件整理「核心資料流」與「各功能資料流」的走向，描述資料從前端到後端、以及在後端的路徑。重點放在「從什麼檔案到什麼檔案」。

## Mermaid 圖表（各功能資料流 + 主要資料）

### 核心資料流（前端 → 後端 → DB）
```mermaid
flowchart LR
  A[src/lib/api/*.ts\nAPI 模組層] --> B[server/routers/*.py\nAPI 路由]
  B --> C[server/crud_ops/*.py\n業務邏輯/DB 操作]
  C --> D[server/models.py\n資料表/模型]
  B --> E[server/schemas.py\nResponse Schema]
```

```
核心資料流（ASCII）
api/* (API modules)
   └─> routers/*.py (API routes)
         └─> crud_ops/*.py (DB logic)
               └─> models.py (DB models)
         └─> schemas.py (response)
```

### 公開作品列表（Public Gallery）
```mermaid
flowchart LR
  A[src/pages/PublicGalleryPage.tsx\n搜尋/排序/篩選] --> B[src/lib/api/public.ts:getPublicBundle]
  B --> C[server/routers/public_bundle.py\nGET /api/public-bundle]
  C --> D[server/crud_ops/*.py\nget_public_*]
  D --> E[server/models.py\nScript/Persona/Organization]
```

```
Public Gallery（ASCII）
PublicGalleryPage.tsx
  └─> api/public.ts:getPublicBundle → public_bundle.py:/public-bundle → crud_ops/*.py:get_public_* → Script/Persona/Organization
```

### 公開作品閱讀頁（Public Reader）
```mermaid
flowchart LR
  A[src/pages/PublicReaderPage.tsx] --> B[src/lib/api/public.ts:getPublicScript]
  B --> C[server/routers/public.py\nGET /api/public-scripts/{id}]
  C --> D[server/models.py:Script\ncontent,tags,persona,org]
  A --> E[src/pages/PublicReaderPage.tsx\nnormalize metadata fields]
  A --> F[src/components/reader/PublicReaderLayout.tsx]
  F --> G[src/components/reader/PublicScriptInfoOverlay.tsx]
```

```
Public Reader（ASCII）
PublicReaderPage.tsx
  ├─> api/public.ts:getPublicScript → public.py:/public-scripts/{id}
  ├─> PublicReaderPage normalize/contact/license parsing
  └─> PublicReaderLayout → PublicScriptInfoOverlay
```

### 工作室（Dashboard / Studio）
```mermaid
flowchart LR
  A[src/pages/PublisherDashboard.tsx] --> B[src/lib/api/personas.ts + organizations.ts + scripts.ts]
  B --> C[server/routers/personas.py]
  B --> D[server/routers/orgs.py]
  B --> E[server/routers/scripts.py]
  C --> F[server/crud_ops/*.py]
  D --> F
  E --> F
  F --> G[server/models.py\nPersona/Organization/Script]
```

```
Studio（ASCII）
PublisherDashboard.tsx
  ├─> api/personas.ts:getPersonas → personas.py → crud_ops/*.py → Persona
  ├─> api/organizations.ts:getOrganizations → orgs.py → crud_ops/*.py → Organization
  └─> api/scripts.ts:getUserScripts → scripts.py → crud_ops/*.py → Script
```

### 編輯劇本資訊（Metadata）
```mermaid
flowchart LR
  A[src/components/dashboard/ScriptMetadataDialog.tsx] --> B[src/lib/api/scripts.ts:getScript]
  B --> C[server/routers/scripts.py\nGET /api/scripts/{id}]
  A --> D[src/hooks/dashboard/useScriptMetadataHydration.ts]
  A --> E[src/hooks/dashboard/useScriptMetadataSave.ts]
  A --> F[src/lib/api/scripts.ts:updateScript]
  F --> G[server/routers/scripts.py\nPUT /api/scripts/{id}]
  G --> H[server/crud_ops/*.py:update_script]
```

```
Metadata（ASCII）
ScriptMetadataDialog.tsx
  ├─> api/scripts.ts:getScript → scripts.py:GET /api/scripts/{id}
  ├─> useScriptMetadataHydration (讀取/映射)
  ├─> useScriptMetadataSave (寫回 script/customMetadata)
  └─> api/scripts.ts:updateScript → scripts.py:PUT /api/scripts/{id} → crud_ops/*.py:update_script
```

### 統計分析（Stats）
```mermaid
flowchart LR
  A[src/components/statistics/StatisticsPanel.tsx] --> B[src/hooks/useScriptStats.ts]
  B --> C[src/lib/statistics/index.ts]
  C --> D[src/lib/statistics/metrics/*]
  B --> E[server/routers/analysis.py\nGET /api/analysis/script/{id}]
  E --> F[server/analysis/analyzer.py]
```

```
Stats（ASCII）
StatisticsPanel.tsx
  └─> useScriptStats.ts → statistics/index.ts → metrics/*
  └─> analysis.py:/api/analysis/script/{id} → analysis/analyzer.py
```

### 組織邀請 / 申請
```mermaid
flowchart LR
  A[src/components/dashboard/publisher/PublisherOrgTab.tsx] --> B[src/lib/api/organizations.ts\ninviteOrganizationMember/requestToJoinOrganization]
  B --> C[server/routers/orgs.py\nPOST /organizations/{id}/invite\nPOST /organizations/{id}/request]
  C --> D[server/crud_ops/*.py\ncreate_organization_invite/request]
  D --> E[server/models.py\nOrganizationInvite/OrganizationRequest]
```

```
Org Invites/Requests（ASCII）
PublisherOrgTab.tsx
  ├─> api/organizations.ts:inviteOrganizationMember → orgs.py:/invite → crud_ops/*.py:create_organization_invite
  └─> api/organizations.ts:requestToJoinOrganization → orgs.py:/request → crud_ops/*.py:create_organization_request
```

### 作品移轉 / 作者移轉 / 組織移轉
```mermaid
flowchart LR
  A[src/lib/api/scripts.ts + personas.ts + organizations.ts\ntransferScriptOwnership/transferPersonaOwnership/transferOrganizationOwnership]
  A --> B[server/routers/scripts.py|personas.py|orgs.py]
  B --> C[server/crud_ops/*.py:transfer_*]
  C --> D[server/models.py\nScript/Persona/Organization]
```

```
Transfers（ASCII）
api/*:transfer* → scripts.py/personas.py/orgs.py → crud_ops/*.py:transfer_* → models.py
```

### 公開作者 / 組織頁
```mermaid
flowchart LR
  A[src/pages/AuthorProfilePage.tsx] --> B[src/lib/api/public.ts:getPublicPersona]
  A --> C[src/lib/api/public.ts:getPublicScripts]
  B --> D[server/routers/public.py\nGET /api/public-personas/{id}]
  C --> E[server/routers/public.py\nGET /api/public-scripts]
  D --> F[server/models.py:Persona]
  E --> G[server/models.py:Script]
```

```
Public Author/Org（ASCII）
AuthorProfilePage.tsx → api/public.ts:getPublicPersona → public.py:/public-personas/{id}
AuthorProfilePage.tsx → api/public.ts:getPublicScripts → public.py:/public-scripts
OrganizationPage.tsx → api/public.ts:getPublicOrganization → public.py:/public-organizations/{id}
```

### 搜尋流程（Public Gallery + Studio）
```mermaid
flowchart LR
  subgraph PublicGallery
    A[src/pages/PublicGalleryPage.tsx\nsearchTerm] --> B[前端過濾\n標題/作者/授權/條款/標籤]
    B --> C[ScriptGalleryCard.tsx]
  end
  subgraph Studio
    D[src/components/dashboard/SearchBar.tsx] --> E[src/lib/api/scripts.ts:searchScripts]
    E --> F[server/routers/scripts.py\nGET /api/search?q=]
    F --> G[server/crud_ops/*.py:search_scripts]
    G --> H[server/models.py:Script\ntitle/content]
  end
```

```
Search（ASCII）
PublicGalleryPage.tsx → 前端過濾（標題/作者/授權/條款/標籤）
SearchBar.tsx → api/scripts.ts:searchScripts → scripts.py:/api/search → crud_ops/*.py:search_scripts
```

### 授權流程（Metadata → Public 顯示）
```mermaid
flowchart LR
  A[src/components/dashboard/ScriptMetadataDialog.tsx] --> B[src/hooks/dashboard/useScriptMetadataSave.ts]
  B --> C[script.content\nTitlePage: License/LicenseUrl/LicenseTerms]
  A --> D[src/lib/api/scripts.ts:updateScript]
  D --> E[server/routers/scripts.py\nPUT /api/scripts/{id}]
  E --> F[server/crud_ops/*.py:update_script]
  F --> G[server/models.py:Script.content]
  G --> H[src/pages/PublicReaderPage.tsx\nnormalize metadata fields]
  H --> I[src/components/reader/PublicScriptInfoOverlay.tsx\nLicense/Terms 顯示]
```

```
License Flow（ASCII）
ScriptMetadataDialog.tsx → useScriptMetadataSave → script/customMetadata
updateScript → scripts.py → crud_ops/*.py:update_script → Script.content
PublicReaderPage.tsx → normalize metadata fields → PublicScriptInfoOverlay
```

### 登入 / 授權（Firebase Auth → API Header）
```mermaid
flowchart LR
  A[src/lib/firebase.ts\nFirebase Auth] --> B[src/contexts/AuthContext.tsx]
  B --> C[src/lib/api/client.ts\nfetchApi]
  C --> D[HTTP Header: Authorization: Bearer <id_token>]
  D --> E[server/dependencies.py\nget_current_user_id]
  E --> F[server/routers/*.py]
```

```
Auth（ASCII）
firebase.ts → AuthContext → api/client.ts:fetchApi → Header: Authorization: Bearer <id_token>
（本機可選）Header: X-User-ID
server/dependencies.py:get_current_user_id → routers
```

### API 指向 / 同源 / CORS
```mermaid
flowchart LR
  A[.env\nVITE_API_URL] --> B[src/lib/api/client.ts\nAPI_BASE_URL]
  B --> C[Browser Request]
  C --> D{同源?}
  D -->|是| E[Nginx /api 反代 → Backend]
  D -->|否| F[server/main.py\nCORSMiddleware allow_origins]
```

```
API Base（ASCII）
.env (VITE_API_URL) → api/client.ts:API_BASE_URL
同源時：Nginx /api 反代，不需要 CORS
跨網域時：server/main.py 啟用 CORSMiddleware
```

### 統計設定流程（Settings → Stats）
```mermaid
flowchart LR
  A[src/components/statistics/StatisticsSettingsDialog.tsx] --> B[src/contexts/SettingsContext.tsx\nstatsConfig]
  B --> C[src/hooks/useScriptStats.ts]
  C --> D[src/lib/statistics/index.ts]
  D --> E[StatisticsPanel.tsx]
```

```
Stats Settings（ASCII）
StatisticsSettingsDialog.tsx → SettingsContext(statsConfig)
→ useScriptStats.ts → statistics/index.ts → StatisticsPanel.tsx
```

### 搜尋申請加入組織流程
```mermaid
flowchart LR
  A[PublisherProfileTab.tsx\n搜尋組織] --> B[src/lib/api/organizations.ts:searchOrganizations]
  B --> C[server/routers/orgs.py\nGET /organizations/search]
  A --> D[src/lib/api/organizations.ts:requestToJoinOrganization]
  D --> E[server/routers/orgs.py\nPOST /organizations/{id}/request]
  E --> F[server/crud_ops/*.py:create_organization_request]
```

```
Org Join Request（ASCII）
PublisherProfileTab.tsx → searchOrganizations → orgs.py:/organizations/search
PublisherProfileTab.tsx → requestToJoinOrganization → orgs.py:/organizations/{id}/request
```

## 核心資料流（前端 → 後端 → DB）

1. 前端 API 入口  
`src/lib/api/*.ts` 以領域分模組封裝 API 呼叫，提供給各頁面與元件使用。

2. 後端 API 入口  
`server/main.py` 設定 FastAPI 與路由。  
`server/routers/*.py` 實作 API endpoints。

3. 後端資料層  
`server/crud_ops/*.py` 實作 DB 存取與業務邏輯。  
`server/models.py` 定義資料庫模型。  
`server/schemas.py` 定義 Pydantic 回傳結構。  
`server/database.py` DB 連線。  
`server/migration.py` DB schema migration。

## 功能資料流

### 1. 公開作品列表（Public Gallery）
1. `src/pages/PublicGalleryPage.tsx`  
呼叫 `src/lib/api/public.ts:getPublicBundle()`（內含 scripts/personas/organizations）  
做搜尋與排序（前端）後渲染卡片。
2. `src/components/gallery/GalleryFilterBar.tsx`  
負責搜尋與排序 UI。
3. `src/components/gallery/ScriptGalleryCard.tsx`  
渲染公開作品卡片。
4. `server/routers/public.py`  
`GET /api/public-scripts`、`/public-personas`、`/public-organizations`
5. `server/crud_ops/*.py:get_public_scripts()`  
拉取公開作品（含 persona/org）

### 2. 公開作品閱讀頁
1. `src/pages/PublicReaderPage.tsx`  
呼叫 `getPublicScript(id)` 取得內容與 metadata。
2. `src/components/reader/PublicReaderLayout.tsx`  
組合封面、作者、標記說明與正文。
3. `src/components/reader/PublicScriptInfoOverlay.tsx`  
顯示標題、作者、授權、metadata 卡片。
4. `server/routers/public.py`  
`GET /api/public-scripts/{id}`

### 3. 工作室（Dashboard / Studio）
1. `src/pages/PublisherDashboard.tsx`  
載入作者、組織、作品、標籤等資料。
2. `src/components/dashboard/publisher/PublisherWorksTab.tsx`  
作品列表與「編輯資訊」入口。
3. `src/components/dashboard/publisher/PublisherProfileTab.tsx`  
作者身份編輯（含 links、banner、組織）。
4. `src/components/dashboard/publisher/PublisherOrgTab.tsx`  
組織編輯、成員與邀請。
5. `server/routers/personas.py`、`orgs.py`、`scripts.py`、`tags.py`  
提供 CRUD 端點。
6. `server/crud_ops/*.py`  
處理資料寫入、轉移、成員、邀請、清理等。

### 4. 編輯劇本資訊（Metadata）
1. 入口  
`src/components/dashboard/ScriptMetadataDialog.tsx`  
從 `getScript(id)` 拉最新內容與 metadata，寫回由 `useScriptMetadataSave()` 負責。
2. Metadata 讀寫  
`src/hooks/dashboard/useScriptMetadataHydration.ts`  
`src/hooks/dashboard/useScriptMetadataSave.ts`
3. 後端更新  
`server/routers/scripts.py` → `server/crud_ops/*.py:update_script()`

### 5. 標記 / 解析 / 統計
1. AST 解析  
`src/lib/screenplayAST.ts` → `DirectASTBuilder`
2. 統計計算（前端）  
`src/hooks/useScriptStats.ts` → `src/lib/statistics/index.ts`
3. 統計計算（後端 API）  
`server/routers/analysis.py` → `server/analysis/analyzer.py`
4. 統計面板  
`src/components/statistics/StatisticsPanel.tsx`
5. 統計設定  
`src/components/statistics/StatisticsSettingsDialog.tsx`  
設定保存於 `src/contexts/SettingsContext.tsx`

### 6. 組織邀請 / 申請
1. 前端  
`PublisherOrgTab.tsx` → `api/organizations.ts:inviteOrganizationMember()` / `requestToJoinOrganization()`  
`PublisherDashboard.tsx` 管理 invite/request list
2. 後端  
`server/routers/orgs.py`  
`/organizations/{id}/invite`、`/request`、`/invites`、`/requests`  
3. DB  
`server/models.py`：`OrganizationInvite`、`OrganizationRequest`  
`server/crud_ops/*.py`：`create_organization_invite` / `create_organization_request` / accept / decline

### 7. 作品移轉 / 作者移轉 / 組織移轉
1. 前端  
`src/lib/api/scripts.ts` / `personas.ts` / `organizations.ts`：`transferScriptOwnership` / `transferPersonaOwnership` / `transferOrganizationOwnership`
2. 後端  
`server/routers/scripts.py` / `personas.py` / `orgs.py`
3. DB  
`server/crud_ops/*.py:transfer_*`  
含 folder 建立與移轉後更新

### 8. 公開作者 / 組織頁
1. `src/pages/AuthorProfilePage.tsx`  
呼叫 `getPublicPersona` 與 `getPublicScripts`
2. `src/pages/OrganizationPage.tsx`  
呼叫 `getPublicOrganization` 與 `getPublicScripts`
3. `server/routers/public.py`  
`/public-personas/{id}`、`/public-organizations/{id}`

## 補充：主要設定與環境
1. API Base  
`vite.config.ts` 與 `.env` `VITE_API_URL`  
`src/lib/api/client.ts` 讀取 `VITE_API_URL`
2. CORS  
`server/main.py` `CORSMiddleware` 設定 allow_origins

## 更新建議
- 若新增欄位，請同步更新：  
`server/models.py` → `server/migration.py` → `server/schemas.py` → 前端表單與顯示
- 若新增 metadata key，請同步更新：  
`useScriptMetadataHydration.ts` / `useScriptMetadataSave.ts` → `PublicScriptInfoOverlay.tsx`
