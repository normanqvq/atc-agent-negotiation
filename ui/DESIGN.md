# Concord demo 設計說明（DESIGN）

評審一天看很多組，注意力很短。所以 demo 的原則只有一條：**一個畫面只講一件事**。報告的人一直按 → 就好。

## 流程（照 docs/PLAN.md 的 3 分鐘腳本）

| 底部標籤 | 畫面 | 講什麼 |
|---|---|---|
| Problem | Intro | 問題 + 三個桌子、規則、人簽名的架構 |
| Live run | Set the conditions | 評審選天氣、跑道等條件和一班真實航班，按 Run（或 →） |
| Live run | 航班 + 時間軸 | 這班飛機晚多久、程式產生了哪些候選時段 |
| Live run | Round 1 | 三個 agent 各說一句 |
| Live run | Blocked | 被規則擋下的提案放大：規則、出處、Chief 的折衷 |
| Live run | Round 2 … | 每一輪一個畫面 |
| Live run | Plan | 最終方案超大字，按 Approve / Override |
| Trust | Trace | 方案每一部分對應哪句話、哪條規則 |
| Failure | Where it fails | 失敗案例（評估資料） |
| Evidence | What we measured | 三個數字 + 和 FCFS、最佳解的比較 |
| Evidence | Close | 口號，問答時停在這頁 |

Live run 的畫面數是從後端回傳的紀錄算出來的：幾輪就幾個 Round 畫面，每個被擋的提案多一個 Blocked 畫面。

## 版面

- 只做橫向 16:9、只做淺色。所有畫面排在固定 1600×900 的舞台上，`App.jsx` 等比縮放。不要用 `vw`/`vh`，不要加 media query。
- 鍵盤：→ / PageDown 下一頁，← / PageUp 上一頁（翻頁筆可以用）。
- 後端沒開時自動播 `data/sample_log.json`，demo 照樣能跑。

## 視覺

- 紅底白字的強制標誌 `.sign--stop`：**只**用在被規則擋下、No safe plan
- 黑底黃字的位置標誌 `.sign--code` 和 Chief 黑條：程式做的事
- 藍：LLM agent。綠：人（Approve）
- 字體：Barlow Condensed 標題、Barlow 內文、JetBrains Mono 只用在資料（航班號、時間、規則 ID）

不要再往畫面上加東西。想加之前先問：評審 3 秒內看得懂嗎？
