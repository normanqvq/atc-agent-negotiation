# Evaluation

How to run: `.venv/bin/python scripts/evaluate.py`. Agents: rule-based fallback (no API key).

## What we ran

- 20 real ATL arrivals (`data/pool.json`, picked from the DOT 2015 data, never used to tune anything) x 3 condition sets = 60 runs
  - all normal
  - thunderstorm + single runway + many connecting
  - fog + one runway closed + gates tight + shift ending

## Numbers

| | Avg delay (min) | Missed connections | Ramp overtime (min) |
|---|---|---|---|
| First come, first served (no gate coordination) | 110.4 | 760 | 1900 |
| Concord (3-desk negotiation) | 67.7 | 32 | 520 |
| Omniscient optimiser (upper bound) | 67.7 | 32 | 520 |

- Consensus within 3 rounds: 60 / 60 (100%)
- Injected illegal proposals blocked by the rule layer: 16 / 16
- Zero legal candidates (no_safe_plan, excluded from averages): 0 runs; legal options existed but the negotiation returned no plan: 0 runs
- FCFS minus Concord delay per condition set (min, positive = Concord better): all normal 30.0; thunderstorm + single runway + many connecting 29.0; fog + one runway closed + gates tight + shift ending 69.0. Most of the gap comes from the tight-gates set, where FCFS waits on the taxiway because nobody coordinated the gate.
- Average per run: 0.0 s, 0 tokens

## Failure case

- row 135473: DL1710 (fog + one runway closed + gates tight + shift ending): worst negotiated outcome, cost 130
- What happened: Concord landed 117 min late with 0 missed connections; the omniscient optimiser found cost 130.
- Why: The desks converged on a legal but expensive slot because each only sees its own data.
- Fix: Let the chief show the soft cost of every legal option to all desks in round 2.

## How the baselines are computed

- FCFS (status quo): the tower gives the earliest safe runway slot (wake, capacity, fuel), the aircraft heads for its original gate; if the gate is busy it waits on the taxiway until the gate frees, and that wait counts as delay. This models desks that only see their own data and coordinate by phone.
- Concord: the plan the chief settles on after the three agents negotiate.
- Omniscient optimiser: sees everything and picks the legal candidate with the lowest soft cost. Theoretical upper bound.

## Limits

- Gates, fuel, crew, connecting passengers and wake category are simulated from the judge's conditions (`src/scenario.py`). Flight, delay, cause and arrival queue are real.
- One aircraft at a time, no knock-on effects.
- Rules are simplified: time gaps instead of nautical miles for wake, observed arrivals x a weather factor for capacity, fuel as minutes of endurance. See the simplification column in `data/rules.json`.
- The evaluation runs in our own simulator and the baselines use the same rulebook. Numbers are relative comparisons, not operational data.
- flights.csv is a 358,774-row subset, so the arrival queue is about 6%% of real traffic density.
