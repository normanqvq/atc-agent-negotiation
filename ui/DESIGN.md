# Concord UI 設計說明（DESIGN）

用 [impeccable](https://impeccable.style) 的規則重做過一次。改 UI 前先看這份，保持一致。

## 版面

- 只做橫向 16:9。所有頁面排在固定 **1600×900** 的舞台上，`App.jsx` 依視窗大小等比縮放（像 Keynote）。不做手機版，CSS 裡不要再加 `max-width` media query，也不要用 `vw` / `vh`（舞台縮放後會算錯）。
- 一次只顯示一頁，像 PPT 一樣翻頁：← → / PageUp PageDown / 空白鍵，或右下角按鈕。
- 4 頁：Intro → Set the conditions（評審選條件和航班）→ Console（按 Run 才開始跑）→ Evidence。
- Console 頁本身不捲動：左欄（Disruption、Arrival queue、協商板）自己捲動並自動跟著最新訊息，右欄固定放 Decision + Rule checks。

## 世界觀：機場地面標誌 + 紙本航班條

只有一個招牌手法，不要到處加：

| 元素 | 樣式 | 用在 |
|---|---|---|
| 強制標誌 `.sign--stop` | 紅底白字 | **只**用在規則擋下東西（WAKE-01 等）、No safe plan |
| 位置標誌 `.sign--code` | 黑底黃字黃框 | 程式做的事：Chief 裁決列、Code, not LLM |
| 停止等待線 `.holdshort` | 兩實兩虛黃線 | Intro 上 agent 和規則的分界 |

## 顏色 = 誰在做事

- 藍 `--llm`：LLM agent（三個桌子）
- 黑 + 黃：程式（Chief、規則、fallback）
- 綠 `--human`：人（Approve、已批准）
- 紅：被規則擋下

顏色只表示狀態和角色，不拿來裝飾。

## 字體

- Barlow Condensed：大標題、面板標題（大寫）
- Barlow：內文、按鈕、標籤
- JetBrains Mono：**只**用在資料（航班號、時間、規則 ID、候選編號）

## 不要做的事（impeccable 偵測器會抓）

- 卡片側邊或上方的粗色條（`border-left: 4px solid ...`）
- 卡片裡再放卡片
- 標題上方的小字 eyebrow
- 用 unicode 符號當圖示（用 `Icon.jsx`）
- 沒有意義的閃爍圓點、發光外框

檢查方式：`npx impeccable detect http://localhost:5173`，目前 0 個問題（hold-short 黃線的 advisory 是刻意的）。
