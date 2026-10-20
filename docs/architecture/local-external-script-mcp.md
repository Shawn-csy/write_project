# 外部台本本機 MCP

這個 MCP 只提供外部公開台本匯入，不提供劇本本文、刪除資料或其他管理操作。

## 安全邊界

- MCP 使用 `stdio`，由 AI client 在本機啟動子程序，不開 HTTP port。
- 後端只在外部台本 admin router 接受 `X-MCP-Key`；其他 API 不接受這個 key。
- `MCP_LOCAL_API_KEY` 與 `MCP_OWNER_ID` 必須同時設定，且 owner 必須仍是管理員。
- `add_external_public_script` 預設只回傳預覽；只有 `confirm=true` 才會寫入首頁。
- MCP 回傳的是 metadata，不會把 PDF 第一頁的 base64 內容傳給模型。

## 本機設定

在專案根目錄 `.env` 加入：

```dotenv
MCP_OWNER_ID=你的管理員使用者ID
MCP_LOCAL_API_KEY=請自行產生一組至少32字元的隨機密鑰
```

安裝本機 MCP 依賴：

```bash
python3 -m pip install -r server/mcp_server/requirements.txt
```

## MCP client 設定

以本機專案路徑為例：

```json
{
  "mcpServers": {
    "write-project-external-scripts": {
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

MCP 的本機 stdio 執行方式符合官方 Python SDK 對本機 server 的建議；不要把這個匯入器改成公開 SSE 或 Streamable HTTP 服務，除非另行設計 OAuth 與網路存取控制。
