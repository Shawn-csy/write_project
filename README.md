# 公開台本平台

這是一個面向「公開閱讀」與「創作工作室」的台本平台。使用者可瀏覽公開作品、管理作者/組織頁面、編輯與發布劇本。

## 功能範圍
- 公開作品瀏覽、搜尋、排序
- 作者與組織公開頁（含橫幅與標籤）
- 工作室 Dashboard（作品/作者/組織/系列管理）
- 劇本編輯與閱讀（支援 metadata、匯出）
- 多語系（繁中 / 英文 / 日文）

## 系統組成
- 前端：`Vite + React + TypeScript`（`src/`）
- 後端：`FastAPI + SQLAlchemy`（`server/`）
- 資料庫：`PostgreSQL` 為正式主用（SQLite 僅備援/遷移）

## 快速開始
請先看操作手冊：`docs/engineering/operations.md`

常用入口：
- 文件索引：`docs/README.md`
- 架構文件：`docs/product/architecture.md`
- 資料流：`docs/product/data-flows.md`
- 測試流程：`docs/engineering/testing.md`

## 部署概念
- 開發：`docker-compose.dev.yml`（前端 1090、後端 1091）
- 正式：`docker-compose.prod.yml`（前端 Nginx + 後端 + Postgres）
- API 可走同源 `/api` 反代，或跨網域直連（由 `VITE_API_URL` 控制）
