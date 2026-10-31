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

Three LLM agents, one for each desk, argue over five candidate plans. A chief
written in code (not an LLM) weighs their answers, ATC counting most, and
proposes a compromise. Every proposal an agent makes goes through the rulebook
in `src/rules.py`; anything that breaks a hard rule is blocked with the rule id
and its source, and the chief never adopts it. Max 3 rounds, then the chief
picks the cheapest legal option. A human approves or overrides at the end.

```
disruption (one row from the 2015 US DOT flight delay data)
        |
        v
[code] 5 candidate plans: ETA + 0/6/12/20/30 min, a gate each, slow-down or hold
       not filtered: an agent may propose an illegal one, the rulebook blocks it
        |
        v
round 1
  ATC / Pilot / Ground   three parallel Haiku calls, each sees only its own data
  [code] rulebook        WAKE-01, CAP-01, FUEL-01, GATE-01 on every proposal -> BLOCKED + source
  [code] chief           consensus? else compromise (ATC 3, Pilot 2, Ground 1), only legal options
        |
        v
all three accept the chief's proposal -> consensus, done
otherwise -> round 2, round 3
        |
        v
after round 3 with no consensus -> chief picks the cheapest legal option
no legal option at all          -> "no safe plan", hand to the human
        |
        v
final plan + full negotiation log + "pending human controller confirmation"
```

Turn cap is fixed at 3. No open-ended agent chatter.

| Agent | Role | Hard constraints (veto, enforced by rules) | Soft goals (negotiated) |
|---|---|---|---|
| ATC | weight 3 | WAKE-01 wake separation, CAP-01 slot capacity | sector throughput |
| Pilot | weight 2 | FUEL-01 landing fuel reserve | passenger connections, land early |
| Ground | weight 1 | GATE-01 gate conflict | keep original gate, avoid crew overtime, next leg on time |

**Two layers of priority**

1. Hard rules have no priority. Each one is a veto. They live in
   `src/rules.py` as pure functions and never go through an LLM.
2. Soft goals are where the agents actually negotiate. The chief scores the
   desks' choices ATC 3, Pilot 2, Ground 1 and breaks ties on the soft cost
   (delay + missed connections + crew overtime).

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

## Run it

```bash
# backend (Python 3.11+)
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
export ANTHROPIC_API_KEY=...            # optional: without it the agents fall back to rules
.venv/bin/uvicorn src.api:app --port 8000

# frontend
cd ui && npm install && npm run dev     # http://localhost:5173, /api is proxied to :8000
```

Without the backend the UI replays `data/sample_log.json`, so the demo still runs.

```bash
.venv/bin/python -m src.scenario      # one world: real flight + simulated gates/fuel/crew
.venv/bin/python -m src.candidates    # the 5 candidate plans
.venv/bin/python -m src.rules         # every candidate through the 4 rules, two weather settings
```

## Repo layout

```
ui/          React deck + live console (see ui/DESIGN.md)
src/
  scenario.py     real row from data/pool.json + simulated world from the judge's conditions
  candidates.py   5 candidate plans, unfiltered
  rules.py        WAKE-01, CAP-01, FUEL-01, GATE-01 + soft cost. pure Python
  agents.py       three Haiku agents, parallel, fixed JSON (issue #3)
  chief.py        code, not LLM: consensus check and compromise (issue #4)
  negotiation.py  the 3-round loop, writes the log JSON (issue #4)
  api.py          FastAPI, POST /api/run (issue #4)
scripts/     build_pool.py (real flights from flights.csv), evaluate.py
data/        pool.json, rules.json, sample_log.json (UI contract), sample_eval.json
docs/        API.md (contract), PROGRESS.md (handoff), PLAN.md, EVAL.md
logs/        one JSON per run (git-ignored)
```

## Honest evaluation

See `docs/EVAL.md` (to be filled in during the hackathon). We will report:

- how many of N sampled disruptions reach consensus within 3 turns
- how many fall back to the deterministic plan, and why
- at least one case where the agents disagree or the system declines

## Data

US DOT 2015 flight delays and cancellations. `airlines.csv` and
`airports.csv` are included. `flights.csv` is ~560 MB and is not committed;
see `data/README.md`.

## License

MIT. See `LICENSE`.
