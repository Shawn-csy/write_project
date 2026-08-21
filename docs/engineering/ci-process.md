# CI 流程（建議）
最後更新：2026-08-21

本專案目前沒有 CI，以下提供可直接套用的流程。建議先放在文件中，未來可轉成 GitHub Actions / GitLab CI。

## 環境需求
- Node.js：**必要** `20.19+`（jsdom 27 需要）
- Python：`3.11+`

## 前端流程
1. 安裝依賴
```
npm ci
```

2. 執行測試（Vitest）
```
npm test
```

3. 型別檢查
```
npm run typecheck
```

4. 相依套件稽核（**high 以上會讓 CI 失敗**）
```
npm audit --omit=dev --audit-level=high
```

已接受風險記錄於 `docs/engineering/dependency-audit.md`。
原本仰賴「每季人工 audit」，實務上會逾期 —— 該文件曾停在 2026-06-30，
期間 `react-router` 中了新的 CSRF advisory 卻沒被發現，因此改由 CI 把關。

5. （可選）前端 build 驗證
```
npm run build
```

## 後端流程
1. 安裝依賴
```
python3 -m pip install -r server/requirements.txt
```

2. 執行測試（Pytest）
```
cd server
python3 -m pytest -q
```

## 最小可用 CI 流程（建議）
```
npm ci
npm test
npm run typecheck
npm audit --omit=dev --audit-level=high
python3 -m pip install -r server/requirements.txt
cd server
python3 -m pytest -q
```

## 一鍵 CI 腳本（本機）
```
bash scripts/ci.sh
```

## （可選）E2E
```
npx playwright install
npx playwright test
```

## 備註
- 前端測試環境使用 `jsdom`（Node 需 `20.19+`）。
- 若 CI 使用容器或鎖定版本，請固定 Node.js 至 `20.19+`。
- `scripts/ci.sh` 目前已支援 `python3` / `python` 自動 fallback。
