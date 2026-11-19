# 部署與本機環境

從 repo 根目錄執行 `docker compose -f deploy/<設定檔> ...`。

| 設定 | 用途 |
|---|---|
| `compose.local.yml` | 完整本機環境，包含獨立的 PostgreSQL |
| `compose.dev.yml` | 輕量開發環境，包含 API 和 Vite |
| `compose.api.yml` | 單獨執行 API，開啟 reload |
| `compose.prod.yml` | 正式服務的 Compose 基線 |
| `nginx/default.conf` | 本機完整環境、正式入口和檢查共用的 Nginx 設定 |
| `launchd/` | macOS 備份、監控和公開資料同步的設定範本 |

正式發布請參照[持續部署與發布程序](../docs/engineering/continuous-deployment.md)。完整環境設定和操作指令見[維運手冊](../docs/engineering/operations.md)。
