# API contract (backend -> frontend)

The frontend calls one endpoint. If the backend is down it replays `data/sample_log.json` and shows REPLAY in the corner.

## POST /api/run

Request:

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

`environment` values are plain strings. The option lists are in `ui/src/lib/scenario.js`.
`pool_index` is one entry of `data/pool.json`.

Response: same shape as `data/sample_log.json`. Fields the UI actually reads:

| Field | Required | Notes |
|---|---|---|
| `scenario.{row_id, flight, airline, origin, destination, date, scheduled_arrival, delay_min, delay_breakdown}` | yes | copy the pool.json entry |
| `arrival_queue.flights[].{flight, sched_arrival "HH:MM", wake_category heavy/medium}` | yes | max 8, already in pool.json |
| `agents.{ATC, PILOT, GROUND}.{label, sees}` | yes | all three |
| `candidates[].{id, arrival "HH:MM", gate, mode, note?}` | yes | mode: hold / slow_down |
| `rounds[].{round, messages[]}` | yes | max 3 rounds |
| `messages[].{id, agent, action, candidate, text, blocked_by?}` | yes | id unique across the log (m1, m2, ...); agent ATC / PILOT / GROUND / CHIEF; action rank / propose / counter / accept / reject / decide; a proposal the rules blocked carries blocked_by: "WAKE-01" |
| `rule_checks[].{id, name, status pass/blocked, detail, source, message_id?}` | yes | blocked ones need message_id so the UI shows them next to that message |
| `decision.{candidate, summary, agreed_in_round, decided_by, status, trace[]}` | yes | status pending_human or no_safe_plan; decided_by consensus / chief_decided / fallback; trace is [{claim, links: [message id or rule id]}] |
| `meta.{model, elapsed_s, tokens, ai_enabled}` | no | nothing breaks without it |

Not read by the UI (safe to omit): `environment`, `scenario.pool_index`, `real_fields`, `simulated_fields`, `decision.arrival/gate/mode`.

Note: the current UI (`ui/src/lib/run.js`) has no shape check and no timeout. Until that is added, the backend must return exactly this shape or the screen breaks.
