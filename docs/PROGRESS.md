# Progress and handoff

> Updated with every commit. If Norman's Claude runs out of usage, a teammate continues from "Next". Read the root `CLAUDE.md` first.

Last update: 31 Oct 14:30 · branch `main` · Norman + Claude

## How to run

```bash
cd ui && npm install && npm run dev                   # frontend, http://localhost:5173
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn src.api:app --port 8000             # backend, once issue #4 lands
.venv/bin/python -m src.rules                         # every candidate through the 4 rules
```

## Done

- [x] Repo, README, MIT license, .gitignore, project CLAUDE.md
- [x] Contracts: `data/sample_log.json`, `data/sample_eval.json`, `data/rules.json`; field list in `docs/API.md`
- [x] `scripts/build_pool.py` and a real 20-flight `data/pool.json` from the flights.csv subset (358k rows, ATL arrivals)
- [x] UI v3 (Ma Mingyang): 1600x900 stage, one idea per screen, design notes in `ui/DESIGN.md`
- [x] Issue #4 (Chris, PR #5 merged): `src/chief.py`, `src/negotiation.py`, `src/api.py`, `src/main.py`, temporary `src/integration_agents.py` until #3 lands. Checked locally: health, run, 422, blocked and no_safe_plan paths
- [x] Real `scripts/evaluate.py` run with rule-based agents (no API key): `data/sample_eval.json` and `docs/EVAL.md` are real numbers now. Rerun once #3's Haiku agents are in
- [x] Real Haiku test done (Simon, issue #9): agents 5.6 s/round, full run 12-15 s, 60-run evaluation 98% consensus, 16/16 blocked, 0 fallbacks. Three UI scenarios screenshotted on flight 16
- [x] PR #12: Haiku evaluation numbers in `data/sample_eval.json` and `docs/EVAL.md`
- [x] PR #13: no-plan label, replay badge when the backend is off, 25 s fetch timeout and shape check
- [x] PR #11: chief text dedupe, honest failure case, UI opens on flight 16
- [x] Issue #3 (PR #8): Simon's `src/agents.py` on main, temporary adapter removed. 80-run sweep and API smoke pass without a key
- [x] PR #7: rule-based evaluation numbers and English handoff doc
- [x] Issue #2 (Norman): `src/scenario.py`, `src/candidates.py`, `src/rules.py`, `scripts/evaluate.py`. Reviewed and merged. 20 flights x 4 condition sets run clean

## In progress

- [ ] Rehearsal and submission (below). Code is feature-complete.

## Next (whoever picks this up starts at the first unchecked item)

1. [ ] Run `docs/TESTING.md` steps 1 to 4 with a real key (issue #9)
2. [ ] Rerun `scripts/evaluate.py` with Haiku, open a PR with the new numbers (step 5)
4. [ ] Add a 25 s timeout and a shape check to `ui/src/lib/run.js` (the UI currently trusts the backend blindly)
5. [ ] Fill team names on the intro screen
6. [ ] Rehearse twice under 3 minutes with the backend off once (replay mode)
7. [ ] 15:30 first submission

## Notes for issue #4 (from the 13:30 cross check)

- `world["arrival_queue"]` does not contain the subject flight. The UI highlights a flight with `is_subject: true` on the timeline; add the subject to `arrival_queue.flights` when assembling the log, but never to the world the rules read, or WAKE-01 / CAP-01 will count it as its own neighbour.
- `requirements.txt` still only has pandas, python-dotenv, pytest. #3 adds `anthropic`, #4 adds `fastapi` and `uvicorn`.
- A log assembled from scenario + candidates + rules matches every path in `data/sample_log.json` (97 paths, none missing).

## Blocked / questions

- Problem numbers on the intro screen: 70% is from the challenge brief, the other two are estimates. Verify with the Airbus mentor or cut.

## Contract changes

- 11:50 sample_log.json: added `environment`, `arrival_queue`, `decision.trace`, CHIEF messages
- 13:00 scenario: `connection_cutoff` for many_connecting is ETA+15 (the issue said ETA+35, which meant nobody ever missed a connection)
- 13:00 evaluate: the FCFS baseline is "earliest safe runway slot, original gate, taxiway wait if the gate is busy". The issue's "earliest legal candidate" is identical to the omniscient optimiser, so there was nothing to compare
