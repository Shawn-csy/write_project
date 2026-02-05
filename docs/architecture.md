# 系統架構圖（Mermaid）

以下架構圖提供給新加入成員快速理解系統組成與資料走向。

## 1. 高階架構（前端 / 後端 / DB）
```mermaid
flowchart TB
  subgraph Client["Frontend (Vite/React)"]
    UI[src/pages + components]
    API[src/lib/db.js\nAPI Client]
    AUTH[src/lib/firebase.js\nFirebase Auth]
    UI --> API
    UI --> AUTH
  end

  subgraph Server["Backend (FastAPI)"]
    ROUTER[server/routers/*.py]
    CRUD[server/crud.py]
    MODELS[server/models.py]
    SCHEMA[server/schemas.py]
    ROUTER --> CRUD
    ROUTER --> SCHEMA
    CRUD --> MODELS
  end

  subgraph DB["SQLite"]
    SQLITE[(scripts.db)]
  end

  API --> ROUTER
  AUTH --> API
  MODELS --> SQLITE
```

## 4. 完整架構圖（Mermaid）
```mermaid
flowchart LR
  subgraph Frontend["Frontend (Vite/React)"]
    FE_PAGES[src/pages/*]
    FE_COMP[src/components/*]
    FE_API[src/lib/db.js\nAPI Client]
    FE_AUTH[src/lib/firebase.js\nFirebase Auth]
    FE_META[src/lib/metadataParser.js]
    FE_STATS[src/lib/statistics/*]
    FE_CTX[src/contexts/SettingsContext.jsx]
  end

  subgraph Backend["Backend (FastAPI)"]
    BE_MAIN[server/main.py]
    BE_DEP[server/dependencies.py]
    BE_ROUTERS[server/routers/*.py]
    BE_CRUD[server/crud.py]
    BE_MODELS[server/models.py]
    BE_SCHEMA[server/schemas.py]
    BE_MIG[server/migration.py]
  end

  subgraph DB["SQLite"]
    DB_SQL[(scripts.db)]
  end

  subgraph Services["External"]
    FB[Firebase Auth]
  end

  FE_PAGES --> FE_API
  FE_COMP --> FE_API
  FE_PAGES --> FE_META
  FE_COMP --> FE_STATS
  FE_CTX --> FE_STATS
  FE_AUTH --> FE_API
  FE_AUTH --> FB

  FE_API --> BE_ROUTERS
  BE_MAIN --> BE_ROUTERS
  BE_ROUTERS --> BE_DEP
  BE_ROUTERS --> BE_SCHEMA
  BE_ROUTERS --> BE_CRUD
  BE_CRUD --> BE_MODELS
  BE_MIG --> BE_MODELS
  BE_MODELS --> DB_SQL
```

## 1-a. 高階架構（ASCII）
```
┌──────────────────────────────┐
│ Frontend (Vite/React)         │
│ - src/pages + components      │
│ - src/lib/db.js (API Client)  │
│ - src/lib/firebase.js (Auth)  │
└───────────────┬──────────────┘
                │ HTTP (X-User-ID)
                ▼
┌──────────────────────────────┐
│ Backend (FastAPI)             │
│ - server/routers/*.py         │
│ - server/crud.py              │
│ - server/models.py            │
│ - server/schemas.py           │
└───────────────┬──────────────┘
                │ SQLAlchemy
                ▼
┌──────────────────────────────┐
│ SQLite (scripts.db)           │
└──────────────────────────────┘
```

## 2. Public vs Studio 路徑
```mermaid
flowchart LR
  subgraph Public
    PG[src/pages/PublicGalleryPage.jsx]
    PR[src/pages/PublicReaderPage.jsx]
    PG -->|getPublicScripts| API[src/lib/db.js]
    PR -->|getPublicScript| API
    API -->|/api/public-*| PUB[server/routers/public.py]
  end

  subgraph Studio
    DASH[src/pages/PublisherDashboard.jsx]
    META[src/components/dashboard/ScriptMetadataDialog.jsx]
    DASH -->|getPersonas/getOrganizations|get| API
    META -->|getScript/updateScript| API
    API -->|/api/scripts| SCRIPTS[server/routers/scripts.py]
    API -->|/api/personas| PERSONAS[server/routers/personas.py]
    API -->|/api/organizations| ORGS[server/routers/orgs.py]
  end
```

## 2-a. Public vs Studio 路徑（ASCII）
```
Public:
  PublicGalleryPage.jsx
      └─ db.js:getPublicScripts/getPublicPersonas/getPublicOrganizations
          └─ public.py (/api/public-*)

  PublicReaderPage.jsx
      └─ db.js:getPublicScript
          └─ public.py (/api/public-scripts/{id})

Studio:
  PublisherDashboard.jsx
      └─ db.js:getPersonas/getOrganizations/getUserScripts
          └─ personas.py / orgs.py / scripts.py

  ScriptMetadataDialog.jsx
      └─ db.js:getScript/updateScript
          └─ scripts.py
```

## 3. 資料模型關聯（簡化）
```mermaid
erDiagram
  USER ||--o{ SCRIPT : owns
  USER ||--o{ PERSONA : owns
  USER ||--o{ ORGANIZATION : owns
  ORGANIZATION ||--o{ SCRIPT : contains
  PERSONA ||--o{ SCRIPT : publishes

  USER {
    string id
    string email
  }
  SCRIPT {
    string id
    string ownerId
    string personaId
    string organizationId
    string content
  }
  PERSONA {
    string id
    string ownerId
    string displayName
  }
  ORGANIZATION {
    string id
    string ownerId
    string name
  }
```

## 3-a. 資料模型關聯（ASCII）
```
User ── owns ── Script
User ── owns ── Persona
User ── owns ── Organization
Organization ── contains ── Script
Persona ── publishes ── Script
```
