# Plan

Autonomous SG 2026 · Airbus Challenge 2 · 4 people · submit 16:15

The backend split with exact function signatures is in GitHub issues #1 to #4. This file is the shorter overview.

## Features

Must have (no demo without these):

| # | Feature | Where |
|---|---|---|
| F1 | Real disruption: pick a row from the pool, add simulated gates/fuel/crew from the judge's conditions | `src/scenario.py` |
| F2 | 5 candidate plans, unfiltered | `src/candidates.py` |
| F3 | 4 hard rules + soft cost, pure Python | `src/rules.py` |
| F4 | 3 independent Haiku agents, parallel, fixed JSON | `src/agents.py` (issue #3) |
| F5 | Chief in code: consensus or compromise, max 3 rounds, fallback | `src/chief.py`, `src/negotiation.py` (issue #4) |
| F6 | `POST /api/run` returning the log JSON | `src/api.py` (issue #4) |
| F7 | UI: conditions, live run, rounds, blocked, plan, trace, failure, evidence | `ui/` (done) |

Nice to have: batch evaluation with real numbers (`scripts/evaluate.py`, ready, needs F5), replay mode (UI has it), transition animation.

Not doing: free-text chat between agents, LLMs doing arithmetic, more than one aircraft, streaming, a database.

## Demo script (3 minutes)

1. 25 s problem: 5 p.m. at Atlanta, thunderstorm, one flight 45 min late, three desks on the phone.
2. 20 s how it works: each desk gets an agent, the rulebook sits between them, a human signs.
3. 60 s live run: judge sets the conditions and picks a flight, Run, three desks talk, one proposal blocked in red with the rule id and source, chief compromise, consensus, Approve.
4. 35 s evidence: three numbers, the comparison with first come first served, one failure case.
5. 15 s close: "The AI can argue, but it can't break the rules."

## Questions judges will ask

- Why three agents instead of one optimiser? The three desks belong to different organisations and do not share all their data. The omniscient optimiser is our upper bound; we show how much of it the desks reach while keeping their data private.
- What is real and what is simulated? Flight, delay, cause, arrival queue: 2015 US DOT data. Gates, fuel, crew, connections, wake category: simulated, tagged SIM on screen.
- What stops the LLM from accepting an unsafe plan? Agents can only reference candidate numbers. Every proposal goes through the rulebook in code. Blocking is deterministic. With the AI off the chief still produces a safe plan.
- Where does it fail? When no candidate is legal (fog + closed runway + low fuel): the system says "no safe plan" and hands over to the human. Shown on the failure screen.
- How is this different from A-CDM? A-CDM shares data and milestones. Concord negotiates trade-offs on top of shared data and leaves an auditable log.

## Timeline

- 13:30 scenario / candidates / rules (done)
- 14:00 UI on the real backend
- 15:00 evaluation numbers
- 15:30 first submission, then only bug fixes
- 15:30 to 16:05 two timed rehearsals
- 16:15 final submission
