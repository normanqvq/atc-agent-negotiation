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

Design in progress (hackathon day, 31 Oct 2026). Code is not in yet.
The turn cap is fixed at 3: if the agents have not agreed by then, the
deterministic fallback decides. No open-ended agent chatter.

## Planned repo layout

```
data/        airlines.csv, airports.csv, sample_event.json, how to get flights.csv
src/
  messages.py        the one message shape every agent uses
  constraints.py     hard rules, pure functions, no AI
  fallback.py        deterministic plan when agents cannot agree
  negotiation.py     the 3-turn loop and the consensus log
  pick_event.py      pick a disruption row from flights.csv
  agents/            atc_agent.py, pilot_agent.py, ground_agent.py
  main.py            entry point
tests/       pytest for the rules and the loop
docs/        PLAN.md (team plan), EVAL.md (what we tested, where it fails)
logs/        generated consensus logs (git-ignored)
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
