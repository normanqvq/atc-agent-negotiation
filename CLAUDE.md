# Concord · Claude Code 專案說明

這是 Autonomous SG 2026 黑客松 Airbus Challenge 2 的專案。四人隊伍，今天 16:15 提交，16:30 現場評審，3 分鐘 demo。
任何 Claude 對話開始前，先讀這兩份：

1. `docs/PROGRESS.md`：做到哪、下一步做什麼、誰在做。**從「下一步」那段直接接著做。**
2. `docs/PLAN.md`：功能清單、模組接口、分工。

## 專案一句話

一個 React 網頁同時是 pitch deck 和 demo。評審在畫面上選環境維度（天氣、跑道、飛機狀態、航站樓、地勤、旅客）和一班真實航班，三個 AI agent（ATC、Pilot、Ground）協商，程式當 Chief 裁決，規則層擋掉不安全方案，最多 3 輪，最後交人批准。口號：The AI can argue, but it can't break the rules.

## 已決定的事，不要重開討論

- Chief 協調器是程式，不是 LLM。ATC 的排序權重最高。
- LLM 只用 claude-haiku-5-5，每輪三個 agent 並行呼叫，tool use 固定 JSON 輸出。agent 只能引用候選方案編號。
- Jev 不接。
- 規則只做 4 條：WAKE-01、CAP-01、FUEL-01、GATE-01。CONN 當軟代價，不否決。
- 後端一次跑完整場回一個 JSON，UI 逐條顯示。不串流。
- UI 文字用英文。團隊文件用中文。
- 評審選的是環境維度，事件（航班、延誤、原因、到達隊列）來自 2015 美國交通部真實資料。登機口、油量、機組、轉機旅客是模擬的，畫面上要標 SIM。

## 前後端合約

`data/` 裡的 JSON 是合約，UI 和後端都照它做。改合約要同時改兩邊，並在 PROGRESS.md 記一筆。

- `data/sample_log.json`：`POST /api/run` 的回傳格式
- `data/sample_eval.json`：評估頁的資料格式
- `data/pool.json`：評審可選的航班池（待產生）
- `data/rules.json`：規則表（待產生）

## 目錄

```
ui/        Vite + React 前端。npm install && npm run dev → :5173。/api 轉到 :8000
src/       Python 後端（FastAPI + 規則 + agent + chief）。待寫
scripts/   build_pool.py、evaluate.py。待寫
data/      合約 JSON、airlines.csv、airports.csv。flights.csv 不進 git
docs/      PROGRESS.md、PLAN.md、EVAL.md
```

flights.csv（560 MB）目前在 repo 上一層：`../flights.csv`。要用就複製到 `data/flights.csv`，已在 .gitignore。

## 工作方式

- 在 branch `ui-concord` 上做。每一個小改動就 commit 一次，**每次 commit 都 push**，隊友要看得到。
- 每次 commit 順便更新 `docs/PROGRESS.md` 的「已完成」和「下一步」。
- 做完一段功能，開一個 subagent 審查，沒問題再 merge 回 main。
- 不要碰 `.env`、API key。key 放環境變數，不進 git。
- 不要 commit `data/flights.csv`、`logs/`。

## 程式風格

寫得像大一學生寫的，讀得懂比厲害重要：

- Python：snake_case，function 短，模組之間只傳 dict 和 list。
- React：JSX 不用 TypeScript，元件小，一個檔案一個元件，plain CSS 不用 Tailwind。
- 註解多一點，中英文混著寫沒關係，note-to-self 風格。
- 不要過度設計：沒有 class hierarchy、沒有 dependency injection、沒有 config framework。
- 變數名清楚但不要太企業風。

## 優先順序

評分標準：技術合理 25%、問題真實 20%、誠實評估 20%、可信可查 20%、影響力 10%、時間紀律 5%。
所以：能跑 > 規則攔截可見 > 評估數字和失敗案例 > 追溯 > 好看。動畫最後做。

## 時間表

- 12:45 命令列跑通一條真實延誤
- 14:00 UI 接上真後端
- 15:00 評估數字出來
- 15:30 先交一版
- 16:15 最終提交
