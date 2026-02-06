# 雲端架構與備援機制
最後更新：2026-02-06（已封存）

## 架構概覽

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 (GCP Cloud Run)                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  localStorage 暫存 ←──編輯──→ API Failover 切換          ││
│  └───────────────────────────┬─────────────────────────────┘│
└──────────────────────────────┼──────────────────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                                 ▼
    ┌─────────────────┐              ┌─────────────────┐
    │   Mac mini API  │              │   雲端備援 API   │
    │ (Cloudflare     │              │ (Cloud Run)     │
    │  Tunnel)        │              │                 │
    │  PostgreSQL     │   ──增量──▶  │  Supabase       │
    │  (完整資料)      │   (最近100本) │  (備援)         │
    └─────────────────┘              └─────────────────┘
```

---

## 分層儲存策略

| 層級 | 儲存內容 | 限制 |
|------|----------|------|
| **Mac mini** | 所有劇本（完整） | 無限 |
| **Supabase** | 最近 100 個活躍劇本 | < 500 MB |
| **localStorage** | 當前編輯中的劇本 | 瀏覽器限制 |

---

## 增量同步機制

### 同步腳本

```python
# sync_to_supabase.py
from datetime import datetime, timedelta

def sync_incremental():
    thirty_days_ago = datetime.now() - timedelta(days=30)
    
    # 同步劇本 (最多 100 個)
    recent_scripts = db.query(Script)\
        .filter(Script.lastModified > thirty_days_ago)\
        .order_by(Script.lastModified.desc())\
        .limit(100).all()
    
    for script in recent_scripts:
        supabase.table("scripts").upsert(script.to_dict()).execute()
    
    # 同步其他表格 (全量，資料量小)
    for user in db.query(User).all():
        supabase.table("users").upsert(user.to_dict()).execute()
    for tag in db.query(Tag).all():
        supabase.table("tags").upsert(tag.to_dict()).execute()
    for theme in db.query(MarkerTheme).all():
        supabase.table("marker_themes").upsert(theme.to_dict()).execute()
    
    # 清理過期資料
    supabase.table("scripts")\
        .delete().lt("lastModified", thirty_days_ago.timestamp() * 1000).execute()
```

### 定時執行

```bash
# 每小時同步 + 每日 ping 防止暫停
0 * * * * python /app/sync_to_supabase.py
0 3 * * * curl -X GET "$SUPABASE_URL/rest/v1/scripts?limit=1" -H "apikey: $SUPABASE_KEY"
```

---

## 備援模式策略

**備援時唯讀 + localStorage 暫存寫入**

```javascript
async function updateScript(id, updates) {
  if (isBackupMode) {
    saveToLocalQueue('update', { id, updates });
    showToast('⚠️ 已暫存本機，主機恢復後自動同步');
    return;
  }
  // 正常寫入...
}

// 每 5 分鐘檢查主機恢復
setInterval(async () => {
  if (isBackupMode) {
    try {
      const res = await fetch(`${PRIMARY_API}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        isBackupMode = false;
        flushLocalQueue();
        showToast('✅ 主機已恢復');
      }
    } catch (e) {}
  }
}, 5 * 60 * 1000);
```

---

## 用量評估

### 基準假設

| 項目 | 數值 |
|------|------|
| 總劇本數 | 1,000 - 2,000 本 |
| 每劇本平均大小 | 50 KB |
| 備援儲存 (100 本) | ~5 MB |
| 備援最長時間 | 3-4 天 |

### 使用者規模 vs 流量

| 活躍使用者/天 | 讀取次數/天 | 備援 4 天流量 | 狀態 |
|---------------|-------------|---------------|------|
| 10 人 | 100 次 | 20 MB | ✅ |
| 50 人 | 500 次 | 100 MB | ✅ |
| **100 人** | **1000 次** | **200 MB** | ✅ |
| 200 人 | 2000 次 | 400 MB | ✅ |
| 500 人 | 5000 次 | 1 GB | ⚠️ |

### 月度總流量估算

| 項目 | 流量 |
|------|------|
| 增量同步 (劇本) | ~150 MB |
| 增量同步 (其他表) | ~15 MB |
| 健康檢查 | ~10 MB |
| 備援讀取 (4天內) | ~200 MB |
| **月總計** | **~375 MB** |
| **Supabase 限制** | **2 GB** |
| **使用率** | **~19%** ✅ |

---

## 風險評估

| 風險 | 影響 | 解法 |
|------|------|------|
| Mac mini 斷線 | 切換備援，唯讀 | 顯示提示，localStorage 暫存 |
| Supabase 7 天暫停 | 備援失效 | 每日 ping |
| 備援長時間 (>7天) | 流量超限風險 | 儘快修復主機 |
| 備援期間寫入 | 資料暫存本地 | 恢復後自動同步 |

---

## 環境變數

```bash
# 前端
VITE_API_URL=https://api.your-tunnel.cloudflare.com/api
VITE_API_FALLBACK=https://backup.run.app/api

# 後端 (Mac mini)
DATABASE_URL=postgresql://user:pass@localhost:5432/scripts
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your-anon-key
```
