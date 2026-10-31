# Evaluation

How to run: `.venv/bin/python scripts/evaluate.py`. Agents: claude-haiku-5-5.

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

- Consensus within 3 rounds: 59 / 60 (98%)
- Injected illegal proposals blocked by the rule layer: 16 / 16
- Zero legal candidates (no_safe_plan, excluded from averages): 0 runs; legal options existed but the negotiation returned no plan: 0 runs
- FCFS minus Concord delay per condition set (min, positive = Concord better): all normal 30.0; thunderstorm + single runway + many connecting 29.0; fog + one runway closed + gates tight + shift ending 69.0. Most of the gap comes from the tight-gates set, where FCFS waits on the taxiway because nobody coordinated the gate.
- Average per run: 5.5 s, 6062 tokens

## Failure case

- row 135473: DL1710 (fog + one runway closed + gates tight + shift ending): costliest outcome, 117 min late, even the optimum could not do better
- What happened: Concord and the omniscient optimiser picked the same plan (cost 130): 117 min late, 0 missed connections, 25 min ramp overtime.
- Why: The conditions left only expensive legal slots. Negotiation cannot create runway capacity or gates that do not exist.
- Fix: Add diversion airports and later slots as candidates, and let the Pilot desk weigh a diversion against a long hold.

## How the baselines are computed

- FCFS (status quo): the tower gives the earliest safe runway slot (wake, capacity, fuel), the aircraft heads for its original gate; if the gate is busy it waits on the taxiway until the gate frees, and that wait counts as delay. This models desks that only see their own data and coordinate by phone.
- Concord: the plan the chief settles on after the three agents negotiate.
- Omniscient optimiser: sees everything and picks the legal candidate with the lowest soft cost. Theoretical upper bound.

## Limits

- Gates, fuel, crew, connecting passengers and wake category are simulated from the judge's conditions (`src/scenario.py`). Flight, delay, cause and arrival queue are real.
- One aircraft at a time, no knock-on effects.
- Rules are simplified: time gaps instead of nautical miles for wake, observed arrivals x a weather factor for capacity, fuel as minutes of endurance. See the simplification column in `data/rules.json`.
- The evaluation runs in our own simulator and the baselines use the same rulebook. Numbers are relative comparisons, not operational data.
- flights.csv is a 358,774-row subset, so the arrival queue is about 6% of real traffic density.
