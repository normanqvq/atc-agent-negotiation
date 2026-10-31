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

## What we built

```
disruption (one row from the 2015 US DOT flight delay data)
        |
        v
  +-----------+     structured     +-------------+     structured     +--------------+
  | ATC agent | -----messages----> | Pilot agent | -----messages----> | Ground agent |
  +-----------+                    +-------------+                    +--------------+
        |                                |                                   |
        +-------------- every proposal goes through constraints.py ----------+
                                         |
                                         v
                       consensus in <= 3 turns, or fallback.py
                                         |
                                         v
                        logs/consensus_<flight>.json (traceable log)
```

| Agent | Cares about |
|---|---|
| ATC | runway wake separation, taxiway blockage, sector throughput |
| Pilot | fuel reserve, flight safety, turbulence, passenger connections |
| Ground | gate utilisation, ground-crew overtime, turnaround delay |

**LLM / non-LLM split**

- Rules (`src/constraints.py`): every safety and operational check. Fuel
  minimum, wake separation, gate availability, crew overtime. No AI here.
- Fallback (`src/fallback.py`): if no consensus after 3 turns, pick the
  earliest slot that passes every hard constraint. No AI here either.
- Agents (`src/agents/`): decide between a small set of candidate proposals.
  Rule-based by default; can plug in an LLM to generate candidates and a
  judgment model (Jev) to pick between them with a confidence score.

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
