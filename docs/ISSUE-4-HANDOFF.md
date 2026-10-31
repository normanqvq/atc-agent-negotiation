# 人 3 後端閉環交接

基於 `issue-2-world-rules` commit `30292c3125069f8f0cf28233ed55e3b946498d7f` 的快照。本地以快照開發；發布分支 issue-4-chief-api 建於人 1 後續提交 71d84dd，草稿 PR 等正式 agent 集成。

## 跑法

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m src.main --pool 1 --weather thunderstorm --runway single
.venv/bin/uvicorn src.api:app --port 8000
# 另一個終端機
cd ui
npm install
npm run dev
```

GET /api/health；POST /api/run 的 body 見 API.md。省略的條件用正常值；無效選項或 pool_index 回 422；無合法候選回 200 和 no_safe_plan。

## 集成狀態

- 已接人 1 的真 scenario/candidates/rules。
- 本地驗證時人 2 尚未提交 agents，integration_agents.py 暫時按相同接口提供規則回答，tokens=0、ai_enabled=false。src/agents.py 存在時自動改用正式模組；不掩蓋其內部 import 錯誤。正式模組合入後可移除臨時 adapter。
- 三個 Haiku 並行與 SDK 失敗回退由人 2 負責；這次未驗證真 API。

## 驗證

- 20 航班 × 4 條件共 80 次 POST 全部 200；79 次合法方案、1 次 no_safe_plan。
- 唯一 message ID、trace 全可解析、最終四個 pass、最多三輪、錯誤輸入 422。
- 受控消息測三輪保底、最低軟成本、3/2/1 同分、tokens=12+7+3=22、一輪回退使整場 AI=false、重複桌別不能算共識。
- Vite production build 通過。
- UI：pool 1 normal 一輪共識；pool 16 thunderstorm/single/many_connecting，CAP-01 擋兩個 #1 提案、Chief 提 #4、第二輪接受，批准與 trace 正常；pool 16 fog/one_closed/low_fuel/zone_closed 顯示 No safe plan。三情境逐頁走到底，截圖在交付目錄 ui-verification/。
- 跑人 1 的 evaluate.py，60 次真規則協商，16/16 違規候選被 first_block 擋下。這不是 LLM 成效；注入檢查使用同一規則模組，不是獨立安全驗證。FCFS 含不協調登機口等待，基準假設見 EVAL.md。

## 套用

issue-4.patch 只含人 3 變更，不重複人 1 模組。先合入人 1 的分支，在 repo 根目錄跑：

```sh
git apply --check /path/to/issue-4.patch
git apply /path/to/issue-4.patch
```

完整快照附生成的 sample_eval.json/EVAL.md 供本地 UI；補丁不覆蓋人 1 的評估結果。正式 agents 到位後重跑。
