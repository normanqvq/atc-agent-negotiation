# 進度與接手說明（PROGRESS）

> 每次 commit 都更新。Norman 的 Claude 用量滿了，隊友從「下一步」直接接著做。接手前先讀根目錄 `CLAUDE.md`。

最後更新：10/31 12:55 · branch `ui-concord` · 做的人：Norman + Claude

## 怎麼跑

```bash
cd ui && npm install && npm run dev     # 前端 http://localhost:5173
# 後端還沒寫，會跑在 :8000
```

## 已完成

- [x] UI 第四版（branch `ui-impeccable`）：改成「一個畫面一件事」的引導式 demo，照 PLAN.md 的 3 分鐘腳本走：Problem → 選條件 → 航班/時間軸 → 每輪一頁 → 被擋的提案放大一頁 → 方案 + Approve → 追溯 → 失敗案例 → 評估數字 → 口號。只做 16:9 淺色，拿掉深色、完整 log 頁、防呆檢查。說明在 `ui/DESIGN.md`
- [x] UI 第三版（branch `ui-impeccable`）：用 impeccable 重做視覺，偵測器 13 → 0 個問題。改成 4 頁 PPT 式翻頁（Intro / Set the conditions / Console / Evidence），固定 16:9 舞台等比縮放，不做手機版。條件和航班選擇獨立一頁，按 Run 才開始跑（console 不再自動跑）。協商板改成「桌子橫排、回合直排」，Chief 裁決只出現一次橫跨三欄。設計規則寫在 `ui/DESIGN.md`
- [x] UI 第二版：3 頁（Intro / Console / Evidence），console 打開自動跑一場，三個桌子佔滿畫面。審查過，7 個必修都修了
- [x] UI 第一版（branch ui-concord）：7 頁 deck（Title、Problem、How it works、Console、Evidence、Rules、Closing），鍵盤左右翻頁，淺色深色兩套主題
- [x] Console：6 個環境維度按鈕 + 真實航班下拉 + Run；FlightStrip（REAL/SIM 標記）；到達隊列時間軸；三欄 agent 逐條顯示 + Chief 列；規則面板（紅色攔截）；決定卡（Approve / Override / Why 追溯 / Replay）
- [x] 後端沒開時自動退回 `data/sample_log.json`，畫面標 REPLAY · backend offline；後端開了就 POST /api/run
- [x] `data/rules.json`、`data/pool.json`（3 筆佔位，等 build_pool.py 換成真的）

- [x] repo、README、MIT license、.gitignore、專案 CLAUDE.md
- [x] `docs/PLAN.md`（舊版：agent 流程已改成 Chief 協調器，接口那段待更新）
- [x] `data/sample_log.json`、`data/sample_eval.json` 合約
- [x] flights.csv 下載好了，在 repo 上一層 `../flights.csv`
- [x] Vite + React 骨架 `ui/`（package.json、vite.config.js、index.html、main.jsx）

## 進行中

- [ ] 等後端 `POST /api/run`。合約寫在 `docs/API.md`

## 下一步（按順序，誰接手就從第一個沒打勾的開始）

1. [x] `ui/src/style.css` 設計 token（兩套主題）
2. [x] `ui/src/App.jsx` deck 骨架：7 頁，鍵盤左右翻頁
3. [x] demo console 元件
4. [x] 評估頁讀 `data/sample_eval.json`，規則頁讀 `data/rules.json`
5. [ ] `scripts/build_pool.py`：flights.csv → `data/pool.json`（20 筆 ATL 到達，WEATHER_DELAY>15 或 LATE_AIRCRAFT_DELAY>20，附同日前後一小時到達隊列）
6. [ ] `data/rules.json` 四條規則 + 出處
7. [ ] 後端 `src/api.py`（FastAPI）`POST /api/run` 先回 sample_log.json，再逐步換成真的
8. [ ] `src/constraints.py` 四條規則、`src/candidates.py` 候選方案生成
9. [ ] `src/agents.py` 三個 Haiku 呼叫 + `src/chief.py` 協調器和保底
10. [ ] `scripts/evaluate.py` → 真的 `data/sample_eval.json`
11. [ ] 回放按鈕、轉場動畫（15:30 之後）

## 卡住的 / 要問的

- Title 頁要填隊員名字（`ui/src/slides/Title.jsx`）
- Problem 頁的三個數字：70% 來自題目 PDF，另外兩個是估算，要找 mentor 核實或改掉
- Chrome 擴充套件打不開 localhost，截圖驗證沒做成，自己開 http://localhost:5173 看

## 合約變更紀錄

- 11:50 sample_log.json 加了 `environment`、`arrival_queue`、`decision.trace`、CHIEF 的訊息
