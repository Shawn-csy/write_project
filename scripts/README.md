# 工具與檢查

| 目錄 | 用途 |
|---|---|
| `release/` | 發布、候選環境、schema 遷移、Pages 建置和內容刷新 |
| `ops/` | 備份、監控、Cloudflare 同步與快取維護 |
| `checks/` | CI、文件、建置、公開路由和 Nginx 檢查 |
| `dev/` | 本機工作室預覽、MCP、效能量測與資料準備 |
| `tests/` | 工具測試及建置用測試資料 |

從 repo 根目錄執行 `bash scripts/ci.sh` 或 `bash scripts/test.sh`。資料目錄的匯入和修復工具隨後端維護，位於 `server/scripts/`。環境設定見 [deploy/](../deploy/README.md)。
