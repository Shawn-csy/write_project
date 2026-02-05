# 公開台本平台

面向「公開閱讀」與「創作工作室」的台本平台。提供作品上架、作者/組織公開頁、搜尋與排行，以及完整的劇本編輯與授權資訊管理。前端為 Vite/React，後端為 FastAPI + SQLite，支援自訂標記、統計分析與權限管理。

## 主要功能

- **公開作品平台**：公開作品列表、搜尋/排序、點閱排行  
- **作者與組織頁**：作者/組織公開頁、橫幅圖片、標籤  
- **創作工作室**：作品管理、作者身份、組織管理、標籤管理  
- **編輯與閱讀**：雙欄即時預覽、角色/場景解析  
- **自訂標記**：範圍/暫停/區塊/行內標記  
- **統計分析**：字數、預估時長、停頓/標記分析  
- **授權與 Metadata**：License/條款/聯絡等標題頁資訊

## 技術架構

- **前端**：React 18 + Vite + React Router
- **後端**：FastAPI + SQLAlchemy + SQLite
- **編輯器**：CodeMirror 6
- **狀態管理**：Context API（Settings/Auth）
- **樣式**：TailwindCSS + Radix UI

## 開發與啟動

### 方式 1：Docker Compose（一鍵啟動）
前端會啟動在 `1090`，後端在 `1091`。
```bash
docker compose up --build
```

### 方式 2：分開啟動

前端：
```bash
npm install
npm run dev
```

後端：
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 1091
```

## 環境變數

前端 API 位址由 `VITE_API_URL` 控制（`.env`）：
```
VITE_API_URL=http://127.0.0.1:1091/api
```

## 產品結構（使用者視角）

- **公開作品**：瀏覽、搜尋、排序（最新/點閱）  
- **作者/組織頁**：展示簡介、作品、外部連結  
- **工作室**：建立作者身份、管理作品、設定授權  

## 資料流文件

- 核心資料流與功能資料流：`docs/data-flows.md`
- 架構圖：`docs/architecture.md`

## 測試

後端：
```bash
cd server
./run_tests.sh
```

前端（Vitest）：
```bash
npm run test
npm run coverage
```

E2E（Playwright）：
```bash
npx playwright install
npx playwright test
```

## 文件

- 核心資料流與功能資料流：`docs/data-flows.md`
- 架構圖：`docs/architecture.md`

## 目錄結構（重點）

- `src/components/renderer/`：AST → UI 渲染
- `src/components/statistics/`：統計面板與設定
- `src/lib/metadataParser.js`：Metadata 解析/寫入
- `server/routers/`：API 路由
- `server/crud.py`：DB 業務邏輯
