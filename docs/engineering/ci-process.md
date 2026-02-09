# CI 流程（建議）
最後更新：2026-02-06

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

3. （可選）前端 build 驗證
```
npm run build
```

## 後端流程
1. 安裝依賴
```
python -m pip install -r server/requirements.txt
```

2. 執行測試（Pytest）
```
cd server
pytest -q
```

## 最小可用 CI 流程（建議）
```
npm ci
npm test
python -m pip install -r server/requirements.txt
cd server
pytest -q
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
