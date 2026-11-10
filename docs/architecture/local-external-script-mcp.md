# 內容管理本機 MCP

同一個本機 MCP 提供外部公開台本匯入，以及 Demo 投稿、清單、新增、編輯與審核。它不提供劇本本文或刪除操作。

## 安全邊界

- MCP 使用 `stdio`，由 AI client 在本機啟動子程序，不開 HTTP port。
- 後端只在外部台本路由和 `/api/admin/mcp/demos` 接受 `X-MCP-Key`；一般 admin API 不接受這個 key。
- `MCP_LOCAL_API_KEY` 與 `MCP_OWNER_ID` 必須同時設定，且 owner 必須仍是管理員。
- `add_external_public_script` 預設只回傳預覽；只有 `confirm=true` 才會寫入首頁。
- Demo 的新增、編輯、審核與送入待審也先回傳資料預覽；只有 `confirm=true` 才會寫入。
- 送入待審須提供至少一位聲演，並確認 Demo 連結公開權利；名單外聲演需另確認公開其姓名與社群連結的同意。
- MCP 回傳的是 metadata，不會把 PDF 第一頁的 base64 內容傳給模型。

## 本機設定

在專案根目錄 `.env` 加入：

```dotenv
MCP_OWNER_ID=你的管理員使用者ID
MCP_LOCAL_API_KEY=請自行產生一組至少32字元的隨機密鑰
```

安裝本機 MCP 依賴：

```bash
server/venv/bin/pip install -r server/mcp_server/requirements.txt
```

## MCP client 設定

以本機專案路徑為例：

```json
{
  "mcpServers": {
    "write-project-content": {
      "command": "/Users/shanti/Desktop/write_project/scripts/run-local-external-script-mcp.sh"
    }
  }
}
```

若 API 不在正式網址，可在 `.env` 覆寫：

```dotenv
WRITE_PROJECT_API_BASE_URL=http://127.0.0.1:1091/api
```

## 建議使用流程

1. 呼叫 `preview_external_public_script` 取得標題、摘要、作者與封面狀態。
2. 向使用者展示預覽，等待明確同意。
3. 使用 `add_external_public_script(..., confirm=true)` 加入首頁。

Demo 管理：

1. `list_demo_targets` 選擇已收錄台本；`list_demos` 與 `list_demo_submissions` 查看現況。
2. `list_demo_voice_actors` 查找聲演身份；來源已核實且需要新頁面時，`ensure_demo_voice_actor` 建立可認領的聲演身份，並將 ID 放進 Demo 的 `voice_actor_ids`。
3. `submit_demo_for_review` 將投稿送入待審；`add_demo` 由管理員直接加入公開 Demo。
4. `update_demo` 編輯已連結的 Demo；`review_demo_submission` 審核投稿。寫入工具皆先以 `confirm=false` 預覽。

本機 MCP 使用 `.env` 中的 API 基址；未設定時連到正式站 API。新的 Demo 管理路由需隨後端部署才可從本機 MCP 使用。

若要先管理 Dev 站，使用 `scripts/run-local-demo-mcp-dev.sh` 作為 MCP client 的 `command`。它使用獨立的 `MCP_DEV_LOCAL_API_KEY`，連到 Dev API；不要把正式站的密鑰拿來測試 Dev。

MCP 維持本機 stdio 執行；不要改成公開 SSE 或 Streamable HTTP 服務，除非另行設計 OAuth 與網路存取控制。
