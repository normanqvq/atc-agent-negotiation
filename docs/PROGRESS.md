# 進度與接手說明（PROGRESS）

> 每次 commit 都更新。Norman 的 Claude 用量滿了，隊友從「下一步」直接接著做。接手前先讀根目錄 `CLAUDE.md`。

最後更新：10/31 12:00 · branch `ui-concord` · 做的人：Norman + Claude

## 怎麼跑

```bash
cd ui && npm install && npm run dev     # 前端 http://localhost:5173
# 後端還沒寫，會跑在 :8000
```

## 已完成

- [x] repo、README、MIT license、.gitignore、專案 CLAUDE.md
- [x] `docs/PLAN.md`（舊版：agent 流程已改成 Chief 協調器，接口那段待更新）
- [x] `data/sample_log.json`、`data/sample_eval.json` 合約
- [x] flights.csv 下載好了，在 repo 上一層 `../flights.csv`
- [x] Vite + React 骨架 `ui/`（package.json、vite.config.js、index.html、main.jsx）

## 進行中

- [ ] UI deck + demo console（Norman + Claude，現在在做）

## 下一步（按順序，誰接手就從第一個沒打勾的開始）

1. [ ] `ui/src/style.css` 設計 token（兩套主題）
2. [ ] `ui/src/App.jsx` deck 骨架：7 頁，鍵盤左右翻頁
3. [ ] demo console 元件：ScenarioPicker → FlightStrip → AgentColumns → RuleChecks → DecisionCard，先讀 `data/sample_log.json`
4. [ ] 評估頁讀 `data/sample_eval.json`，規則頁讀 `data/rules.json`
5. [ ] `scripts/build_pool.py`：flights.csv → `data/pool.json`（20 筆 ATL 到達，WEATHER_DELAY>15 或 LATE_AIRCRAFT_DELAY>20，附同日前後一小時到達隊列）
6. [ ] `data/rules.json` 四條規則 + 出處
7. [ ] 後端 `src/api.py`（FastAPI）`POST /api/run` 先回 sample_log.json，再逐步換成真的
8. [ ] `src/constraints.py` 四條規則、`src/candidates.py` 候選方案生成
9. [ ] `src/agents.py` 三個 Haiku 呼叫 + `src/chief.py` 協調器和保底
10. [ ] `scripts/evaluate.py` → 真的 `data/sample_eval.json`
11. [ ] 回放按鈕、轉場動畫（15:30 之後）

## 卡住的 / 要問的

- 無

## 合約變更紀錄

- 11:50 sample_log.json 加了 `environment`、`arrival_queue`、`decision.trace`、CHIEF 的訊息
