# Dev 音聲作品定期掃描

這是純後端程式，不使用 GPT 或其他 LLM。每週一台北時間 10:00 由 macOS launchd 執行。程式讀取公開來源、比對 Dev 資料庫中的已公開與待審作品，只產生新作候選報告，不建立投稿或發布作品。

來源：被談聲聆與風橙實驗室的 CxC 公開目錄；風橙與雪白薄紗的官方 Portaly 頁；NEON VOICE 的官方 YouTube 動態。官網中的商品連結只作為比對線索，不抓取其目標網站內容。來源讀取失敗會列入報告並讓執行程序以非零狀態結束。

程式：`server/scripts/check_audio_work_releases.py`。執行腳本：`scripts/run-audio-work-discovery-dev.sh`。排程：`scripts/com.shawnup.write-project-audio-discovery.plist`。狀態檔存於 Dev API 的 `/data/audio-discovery/state.json`，避免重複通知。報告存於 `~/Library/Logs/write-project-audio-discovery/latest.json`；有新候選或錯誤時，也會保留在 `history/` 並發出本機通知。

變更程式後，先重建映像：

```sh
docker compose -p write-project-dev-api-8891 -f docker-compose.dev-api-8891.yml build dev-api-8891
```

變更執行腳本後，複製到 `~/Library/Application Support/OpenScripts/run-audio-work-discovery-dev.sh`。排程放在使用者 Library，避免 macOS 背景服務對 Desktop 資料夾的存取限制。可用下列命令手動執行及檢查：

```sh
launchctl kickstart -k gui/$(id -u)/com.shawnup.write-project-audio-discovery
launchctl print gui/$(id -u)/com.shawnup.write-project-audio-discovery
```

候選作品需要人工核對標題、權利及連結後，再走現有投稿審核流程。首次掃描可能列出過去漏收錄的作品，不代表它們於掃描當天發布。
