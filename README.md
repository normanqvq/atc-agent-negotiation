# ATC Agent Negotiation

Autonomous SG 2026 · Airbus AI & Aerospace Track · Challenge 2

> How might AI help air traffic controllers, pilots and ground operations staff
> make faster and better decisions?

Three independent AI agents (ATC, Pilot, Ground Ops) negotiate a fix for a
real flight disruption and reach consensus in **at most 3 turns**. Every
message is structured, every proposal is checked against hard operational
constraints by plain rules (not an LLM), and if the agents cannot agree, a
deterministic fallback picks the safest legal option.

## The problem

When a runway closes or weather delays a flight, today the fix is phone calls
and manual updates between the tower, the cockpit and the ground crew. Each
side only sees its own constraints, so the result is holding patterns, wasted
fuel and missed connections.

**User:** an airline duty manager / tower supervisor handling one delayed
arrival. **Status quo:** three phone calls and a guess.

## How the agents work together

The slogan: **the AI can argue, but it can't break the rules.**

```
disruption: one real delayed arrival (2015 US DOT data) + the judge's conditions
        |
        v
[code]  build 5 candidate landing slots (time, gate, slow down / hold)
        illegal ones are kept on purpose
        |
        v
round 1   ATC ranks, Pilot proposes, Ground proposes
          (3 separate Haiku calls in parallel, each desk sees only its own data)
        |
        v
[rules] every proposal is checked by plain Python: WAKE-01, CAP-01, FUEL-01, GATE-01
        a proposal that breaks one is marked BLOCKED in front of everyone
        |
        v
[Chief] code, not an LLM
        all three on the same legal slot -> consensus, done
        otherwise -> propose a compromise (weights ATC 3, Pilot 2, Ground 1)
        |
        v
rounds 2-3  each desk accepts the Chief's proposal or counters
        |
        v
no consensus after round 3 -> Chief picks the cheapest legal slot
no legal slot at all       -> "no safe plan", hand to the duty manager
        |
        v
plan + full log + trace, waiting for a human to approve or override
```

| Desk | Sees only | Cares about |
|---|---|---|
| ATC (Tower) | arrival queue, wake categories, weather-reduced acceptance rate | runway flow, separation |
| Pilot (Cockpit) | fuel endurance, crew duty time, connecting passengers | fuel margin, connections, landing early |
| Ground (Ramp) | gate occupancy, ramp crew shift, next departure | free gate, crew overtime, next leg on time |

**Two layers**

1. Hard rules (`src/rules.py`) are vetoes. Pure functions, no LLM, deterministic.
   Sources and simplifications are in `data/rules.json`.
2. Soft cost (delay, missed connections, crew overtime) is only used to choose
   between legal slots. CONN-01 (connections) is a cost, never a veto.

**Every message has the same shape**

```json
{"id": "m2", "agent": "PILOT", "action": "propose", "candidate": 1,
 "text": "Request 18:15 to protect 32 connecting passengers", "blocked_by": "CAP-01"}
```

Actions: `rank`, `propose`, `accept`, `counter` (desks) and `propose`, `decide`
(Chief). Agents can only point at a candidate id; they cannot invent times or gates.

**LLM / non-LLM split**

- Code: building candidates, every safety check, the Chief, the final pick.
- LLM (`claude-haiku-5-5`): each desk's choice and its one-line reason.
  Without a key, or if a call fails or is slow, that desk answers with a simple rule.
- Human in the loop: the plan is a recommendation. Nothing happens until the
  duty manager approves or overrides it, and every claim traces back to a
  message or a rule check.

## Status

Working end to end (31 Oct 2026). The UI calls `POST /api/run`; the backend
runs three independent `claude-haiku-5-5` agents in parallel each round, the
rule layer blocks unsafe proposals, and the Chief (plain code) decides within
3 rounds. Without `ANTHROPIC_API_KEY` the agents fall back to simple rules and
the demo still runs. If the backend is down, the UI replays
`data/sample_log.json`.

## How to run

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
export ANTHROPIC_API_KEY=...                      # optional, rule-based agents without it
.venv/bin/uvicorn src.api:app --port 8000         # backend
cd ui && npm install && npm run dev               # UI on :5173, /api goes to :8000

.venv/bin/python -m src.main --pool 16 --weather thunderstorm --runway single --passengers many_connecting
.venv/bin/python scripts/evaluate.py              # 60-run evaluation -> data/sample_eval.json, docs/EVAL.md
```

Good demo flight: pool 16 (DL1126) with Thunderstorm + Single runway + Many
connecting. Its earliest slot breaks CAP-01, so the rule layer visibly blocks
proposals.

## Repo layout

```
data/        pool.json (20 real flights), rules.json, sample_log.json / sample_eval.json (UI contracts)
src/
  scenario.py        build_scenario: real flight + simulated gates/fuel/crew/connections
  candidates.py      build_candidates: 5 landing slots, illegal ones kept on purpose
  rules.py           WAKE-01, CAP-01, FUEL-01, GATE-01 + soft cost. Pure Python, no AI
  agents.py          three Haiku desks (ATC, Pilot, Ground), parallel, rule-based fallback
  chief.py           consensus check, weighted compromise, final pick. Code, not an LLM
  negotiation.py     run(): the 3-round loop, returns the sample_log.json shape
  api.py             FastAPI: POST /api/run, GET /api/health
  main.py            command line run
scripts/     build_pool.py, evaluate.py
ui/          Vite + React demo deck
docs/        PLAN.md, PROGRESS.md, API.md, EVAL.md
logs/        one JSON per run (git-ignored)
```

## Honest evaluation

See `docs/EVAL.md`: 60 runs (20 real flights x 3 condition sets), consensus
rate, injected unsafe proposals blocked, baselines, a failure case and the
limitations. The numbers are not tuned; with the current cost model the
earliest legal slot is always cheapest, so Concord ties or loses slightly to
first come, first served on delay. The measured win is that no final plan
breaks a hard rule.

## Data

US DOT 2015 flight delays and cancellations. `airlines.csv` and
`airports.csv` are included. `flights.csv` is ~560 MB and is not committed;
see `data/README.md`.

## License

MIT. See `LICENSE`.
