# 開發計畫（Plan）

Autonomous SG 2026 · Airbus Challenge 2 · 4 人 · 16:30 提交

## 1. 要做的功能

### 必做（MVP，沒有這些就沒 demo）

| # | 功能 | 說明 |
|---|---|---|
| F1 | 讀事件 | 從 `flights.csv` 挑一筆 WEATHER_DELAY > 15 或 LATE_AIRCRAFT_DELAY > 20 的航班，補上燃油、登機門等合成欄位，變成一個 event dict |
| F2 | 合法選項生成 | 用規則算出所有「跑道時段 × 登機門 × 航路」的組合，砍掉違反硬限制的 |
| F3 | 三個 agent | ATC 提案、Pilot 回應、Ground 回應、ATC 裁決。每個 agent 是一個 function，輸入 event 和目前提案，輸出一個 Message |
| F4 | 協商迴圈 | 最多 3 輪，有共識就停，沒共識第 3 輪 ATC 拍板 |
| F5 | 共識紀錄 | 每輪每個 agent 的 Message 存成 list，結束寫成 JSON 檔 |
| F6 | 終端機輸出 | 跑完印出每輪誰說了什麼、最後方案、被規則擋掉的選項有幾個 |

### 加分（MVP 跑通之後才做）

| # | 功能 | 說明 |
|---|---|---|
| G1 | Jev 做選擇 | ATC 裁決時把「維持 / 採納 Pilot / 採納 Ground」丟給 Jev，拿機率和信心。信心低於 0.6 退回規則 |
| G2 | LLM 寫理由 | Message 的 reason 欄位用 LLM 寫成一句人看得懂的話 |
| G3 | 網頁儀表板 | 顯示事件、每輪的 Message、最終方案、合法選項被砍掉的過程 |
| G4 | 批次評估 | 跑 50 筆事件，統計幾筆 3 輪內收斂、幾筆 ATC 拍板、幾筆無合法選項 |

### 不做

- Agent 之間的自由文字對話
- 任何讓 LLM 做燃油或間隔計算的事
- 多班飛機同時協商（只處理一班）

## 2. 模組和接口

每個模組一個檔案，模組之間只傳 dict 和 list，不傳物件，方便四個人並行寫。

### `src/event.py`（F1）

```python
def load_sample_event() -> dict
    # 讀 data/sample_event.json

def pick_event_from_dataset(path="data/flights.csv", seed=0) -> dict
    # 挑一筆符合條件的航班，加上合成欄位，回傳跟 sample_event.json 同樣的 dict
```

event dict 的欄位以 `data/sample_event.json` 為準。所有人以這個檔案當合約。

### `src/options.py`（F2）

```python
def build_legal_options(event: dict) -> list[dict]
    # 回傳所有通過硬限制的提案
    # 每個提案長這樣：
    # {"new_arrival_time": "17:48", "gate": "B14", "route": "direct", "extra_delay_min": 43}

def rejected_options(event: dict) -> list[dict]
    # 回傳被砍掉的提案，每個附上 "failed_check": "fuel_reserve"
    # demo 用，展示規則擋了什麼
```

### `src/constraints.py`（F2，純規則）

```python
def check_fuel(event, proposal) -> tuple[bool, str]
def check_wake_separation(event, proposal) -> tuple[bool, str]
def check_gate_free(event, proposal) -> tuple[bool, str]
def check_all(event, proposal) -> tuple[bool, list[str]]
    # 回傳 (是否全過, 通過的檢查名稱 list)
```

每個 check 回傳 `(True, "fuel_reserve")` 或 `(False, "fuel below 45 min at 18:20")`。

### `src/messages.py`（F3）

```python
def make_message(agent, turn, action, proposal, reason, checks_passed, confidence=1.0) -> dict
```

agent 只能是 `"ATC"`, `"PILOT"`, `"GROUND"`。action 只能是 `"propose"`, `"accept"`, `"counter"`, `"reject"`。傳錯直接 raise。

### `src/agents/atc_agent.py`、`pilot_agent.py`、`ground_agent.py`（F3）

三個檔案同樣的接口：

```python
def respond(event: dict, proposal: dict, legal_options: list[dict], turn: int) -> dict
    # 回傳一個 Message dict
```

ATC 多一個：

```python
def rule_on_counters(event, own_proposal, pilot_msg, ground_msg, legal_options, turn) -> dict
    # 回傳一個 Message，action 是 "propose"，proposal 是裁決後的提案
    # reason 寫為什麼採納或不採納

def final_decision(event, legal_options, log) -> dict
    # 第 3 輪沒共識時叫這個，從 legal_options 選一個
```

Agent 內部怎麼選是各自的事，外面不管。一開始全部用規則，之後 ATC 的 `rule_on_counters` 換成 Jev。

### `src/negotiation.py`（F4、F5）

```python
MAX_TURNS = 3

def run(event: dict) -> dict
    # 回傳：
    # {
    #   "event": event,
    #   "final_proposal": {...},
    #   "consensus": True / False,
    #   "turns_used": 2,
    #   "decided_by": "consensus" / "atc_final",
    #   "log": [message, message, ...],
    #   "legal_option_count": 12,
    #   "rejected_option_count": 6,
    #   "status": "pending human controller confirmation"
    # }

def save_log(result: dict, folder="logs") -> str
    # 寫 JSON，回傳檔案路徑
```

### `src/main.py`（F6）

```bash
python src/main.py                 # 用 sample_event.json
python src/main.py --from-dataset  # 從 flights.csv 挑
python src/main.py --seed 7        # 換一筆
```

印出每輪內容和最終方案。

### Jev 接口（G1，之後再接）

```python
# src/judge.py
def pick(context: str, options: list[str]) -> tuple[str, float]
    # 回傳 (選中的 option, 信心)
    # 沒有 API key 或出錯時 raise，由呼叫端退回規則
```

## 3. 分工

| 人 | 模組 | 第一個里程碑 |
|---|---|---|
| A | `event.py`、`constraints.py`、`options.py` | 12:30 前 `build_legal_options(sample_event)` 能回傳一個 list |
| B | 三個 agent 檔案、`messages.py` | 12:30 前三個 `respond` 能對假的 proposal 回傳 Message |
| C | `negotiation.py`、`main.py`、之後儀表板 | 12:30 前迴圈能用假 agent 跑完 3 輪 |
| D | README、`docs/EVAL.md`、簡報、G4 批次評估、之後接 Jev | 12:30 前簡報骨架和 demo 腳本 |

A 和 B 的合約是 `sample_event.json` 和 proposal dict 的欄位。先把這兩個定死，再各自寫。

## 4. 時間表

| 時間 | 事 |
|---|---|
| 11:00–11:20 | 一起看完這份 Plan，定死 event 和 proposal 的欄位 |
| 11:20–12:30 | 各自寫，用假資料 |
| 12:30 | 合流一次，`python src/main.py` 要能從頭跑到尾 |
| 12:30–14:30 | 接真資料、修 bug、D 開始批次評估、Jev 試接 |
| 14:30–15:30 | 儀表板或終端機美化、EVAL.md 填數字和失敗案例 |
| 15:30 | 功能凍結，只修 bug |
| 15:30–16:10 | 排練 demo 兩次，3 分鐘內 |
| 16:10 | 提交 |

## 5. Demo 腳本（3 分鐘）

1. 30 秒：問題。一班 ORD 到 ATL 的航班天氣延誤 45 分鐘，今天怎麼處理。
2. 60 秒：跑 `main.py`。指著終端機講：規則砍了 6 個選項、ATC 提 17:55、Pilot counter 說轉機趕不上、ATC 採納、Ground accept、2 輪收斂。
3. 30 秒：共識紀錄 JSON。每一步可追溯。
4. 30 秒：失敗案例。跑一筆燃油很緊的事件，合法選項只剩 1 個，系統標記「無協商空間，直接交人類」。
5. 30 秒：評估數字。50 筆裡幾筆收斂、幾筆拍板、幾筆交人。

## 6. 評審會問的問題，先準備答案

- 為什麼不讓 LLM 直接算？因為燃油和間隔是算術，規則不會錯，LLM 會。
- 三輪沒共識怎麼辦？ATC 拍板，但從合法選項裡選，然後交人類確認。
- 哪裡會出錯？合成欄位是假設的；只處理一班飛機；Jev 的信心分數沒有第三方驗證。
