# Issue #4 handoff: backend loop (chief, negotiation, API)

Built on the `issue-2-world-rules` snapshot `30292c3`; the release branch `issue-4-chief-api` was cut from person 1's later commit `71d84dd`. Merged into main as PR #5.

## How to run

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m src.main --pool 1 --weather thunderstorm --runway single
.venv/bin/uvicorn src.api:app --port 8000
# in another terminal
cd ui
npm install
npm run dev
```

GET /api/health; POST /api/run body as in API.md. Omitted conditions take their normal value; an invalid option or pool_index returns 422; no legal candidate returns 200 with no_safe_plan.

## Integration state

- Wired to person 1's real scenario / candidates / rules.
- Person 2's agents were not in when this was validated. `integration_agents.py` is a temporary adapter with the same interface that answers from rules only, tokens=0, ai_enabled=false. When `src/agents.py` exists it is used automatically; import errors inside it are not masked. Remove the adapter once #3 lands.
- Three parallel Haiku calls and SDK-failure fallback are person 2's job; the real API was not exercised here.

## Validation

- 20 flights x 4 condition sets = 80 POSTs, all 200; 79 legal plans, 1 no_safe_plan.
- Unique message ids, every trace link resolves, the final 4 checks pass, max three rounds, bad input 422.
- Controlled messages tested: three-round fallback, lowest soft cost, 3/2/1 ties, token sum 12+7+3=22, one fallback round makes the whole run AI=false, duplicate desks cannot form consensus.
- Vite production build passes.
- UI: pool 1 normal gives round-1 consensus; pool 16 thunderstorm/single/many_connecting has CAP-01 blocking two #1 proposals, the chief proposes #4, accepted in round 2, approve and trace work; pool 16 fog/one_closed/low_fuel/zone_closed shows No safe plan. All three scenarios walked screen by screen.
- Ran person 1's evaluate.py: 60 rule-based negotiations, 16/16 illegal candidates blocked by first_block. This is not an LLM result; the injection check uses the same rule module and is not an independent safety check. FCFS includes the uncoordinated gate wait; baseline assumptions are in EVAL.md.
