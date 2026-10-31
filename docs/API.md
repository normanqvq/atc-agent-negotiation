# 後端要給前端的東西（API 合約）

前端只打一個端點。沒開後端時前端自動用 `data/sample_log.json` 播放，右上角標 REPLAY。

## POST /api/run

請求（前端送的）：

```json
{
  "pool_index": 7,
  "environment": {
    "weather": "thunderstorm",
    "runway": "single",
    "aircraft_status": "normal",
    "terminal": "tight",
    "ground_crew": "shift_ending",
    "passengers": "many_connecting"
  }
}
```

`environment` 的值是純字串。選項清單在 `ui/src/lib/scenario.js` 的 DIMENSIONS。
`pool_index` 對應 `data/pool.json` 裡的一筆。

回傳：跟 `data/sample_log.json` 同樣的形狀。前端真的會讀的欄位：

| 欄位 | 必要 | 備註 |
|---|---|---|
| `scenario.{row_id, flight, airline, origin, destination, date, scheduled_arrival, delay_min, delay_breakdown}` | 是 | 直接從 pool.json 那筆複製過來就好 |
| `arrival_queue.flights[].{flight, sched_arrival "HH:MM", wake_category heavy/medium}` | 是 | 最多 8 筆，pool.json 已經有 |
| `agents.{ATC, PILOT, GROUND}.{label, sees}` | 是 | 三個都要 |
| `candidates[].{id, arrival "HH:MM", gate, mode, note?}` | 是 | mode: hold / slow_down / divert |
| `rounds[].{round, messages[]}` | 是 | 最多 3 輪 |
| `messages[].{id, agent, action, candidate, text, blocked_by?}` | 是 | id 整場唯一（m1, m2…）；agent 是 ATC / PILOT / GROUND / CHIEF；action 是 rank / propose / counter / accept / reject / decide；被規則擋掉的提案加 blocked_by: "WAKE-01" |
| `rule_checks[].{id, name, status pass/blocked, detail, source, message_id?}` | 是 | blocked 的要帶 message_id，前端才會在那句話出現時同步顯示 |
| `decision.{candidate, summary, agreed_in_round, decided_by, status, trace[]}` | 是 | status: pending_human 或 no_safe_plan；decided_by: consensus / chief_decided / fallback；trace 是 [{claim, links:[訊息 id 或規則 id]}] |
| `meta.{model, elapsed_s, tokens, ai_enabled}` | 否 | 缺了不會壞 |

前端不讀（可以省略）：`environment`、`scenario.pool_index`、`real_fields`、`simulated_fields`、`decision.arrival/gate/mode`。

後端連不上或回非 200，前端就播範例紀錄。回傳的形狀前端不再檢查，請照 sample_log.json 給齊。
