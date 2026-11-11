# 待核可項目的 Email 通知

訪客在公開站送出需要管理員核可的項目時，後端會在回應之後寄一封 Email 給站長。資料庫寫入仍是唯一的事實來源：寄信是盡力而為，SMTP 故障不會讓投稿失敗或消失。

## 會通知的項目

| 類型（`kind`） | 端點 |
|---|---|
| `demo` | `POST /api/public-demo-submissions`（活動頁投稿會自動核可，不通知） |
| `audio_work` | `POST /api/public-audio-work-submissions` |
| `external_author_profile` | `POST /api/external-author-profile-submissions` |
| `voice_actor_profile` / `author_profile` | `POST /api/voice-actor-profile-submissions`（`profileKind` 為 `voice_actor` 或 `author`） |
| `voice_actor_claim` | `POST /api/voice-actor-claims` |
| `resource_profile` | `POST /api/voice-actor-profile-submissions`（`profileKind: "production"`，後製／封面／錄音室） |
| `new_resource` | `POST /api/production-resource-submissions` |

意見回饋（`/api/public-feedback`）原本就有自己的 Email，沿用 `services/public_feedback_email.py`。機器人欄位（honeypot）與重複投稿（409）不會觸發通知。

## 設定（正式環境的 API 容器）

與意見回饋共用同一組變數：

| 變數 | 說明 |
|---|---|
| `SMTP_HOST` | 空值代表不寄信，只在日誌留一行警告。**目前正式環境是空的。** |
| `SMTP_PORT` | 預設 587 |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | 登入帳密；Gmail 需使用「應用程式密碼」 |
| `SMTP_FROM` | 寄件者，預設為 `SMTP_USERNAME` |
| `SMTP_USE_TLS` / `SMTP_USE_SSL` | 預設 STARTTLS；用 465 時設 `SMTP_USE_SSL=1` |
| `FEEDBACK_NOTIFICATION_EMAIL` | 收件者（可逗號分隔多個） |
| `ADMIN_REVIEW_URL` | 信中「前往審核」的連結，預設 `https://studio-open-scripts.shawnup.com/superadmin` |

密碼只放在 API 容器的環境變數，不要寫進程式碼或 Git。

## 驗證

```bash
cd server && ./venv/bin/python -m pytest tests/test_admin_notifications.py -q
```

上線後送一筆測試投稿，確認收件匣有信；日誌出現 `Approval email is not configured` 代表 `SMTP_HOST` 還沒設定。
