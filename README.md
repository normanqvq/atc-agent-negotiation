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

ATC is the chief. Pilot and Ground advise; ATC decides. But nobody, not even
ATC, can pick an option that breaks a hard safety constraint, because those
options are removed by plain rules before any agent sees them.

```
disruption (one row from the 2015 US DOT flight delay data)
        |
        v
[rules] build the legal option set: runway slots x free gates
        drop anything that breaks a hard constraint
        (fuel minimum, wake separation, gate already occupied)
        |
        v
turn 1
  ATC     picks a proposal from the legal set
  Pilot   accept / counter, with reason
  Ground  accept / counter, with reason
  ATC     rules on the counters: keep own proposal, or adopt one
        |
        v
both accept -> consensus, done
otherwise   -> ATC's ruling becomes the turn 2 proposal
        |
        v
after turn 3 with no consensus -> ATC picks from the legal set, no more asking
        |
        v
final plan + full negotiation log + "pending human controller confirmation"
```

Turn cap is fixed at 3. No open-ended agent chatter.

| Agent | Role | Hard constraints (veto, enforced by rules) | Soft goals (negotiated) |
|---|---|---|---|
| ATC | chief, decides | wake separation, runway closure, taxiway blockage | sector throughput |
| Pilot | advises | fuel below minimum reserve, flight safety | passenger connections, less turbulence |
| Ground | advises | gate already occupied at that time | keep original gate, avoid crew overtime, short turnaround |

**Two layers of priority**

1. Hard constraints have no priority. Each one is a veto. They live in
   `constraints.py` as pure functions and never go through an LLM.
2. Soft goals are where the agents actually negotiate. When ATC rules on
   counters it follows a fixed order: does the counter hurt runway
   throughput? If not, Pilot's counter beats Ground's (passengers and fuel
   margin over gate convenience).

**Every message has the same shape**

```json
{
  "agent": "PILOT",
  "turn": 1,
  "action": "counter",
  "proposal": {"new_arrival_time": "17:48", "gate": "B14", "route": "direct"},
  "reason": "17:55 misses the 18:30 connection for 32 passengers",
  "checks_passed": ["fuel_reserve", "wake_separation", "gate_free"],
  "confidence": 0.82
}
```

Actions are only `propose`, `accept`, `counter`, `reject`. No free text
between agents.

**LLM / non-LLM split**

- Rules: every safety and operational check, and building the legal option
  set. No AI.
- Agents: choose between a small set of legal options. Rule-based by default.
  Can plug in an LLM to write the `reason` line and a judgment model (Jev)
  to pick between options with a confidence score. Low confidence falls back
  to the rule-based choice.
- Human in the loop: the final plan is a recommendation. The log shows what
  Pilot and Ground objected to, so a human controller can overrule it.

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
