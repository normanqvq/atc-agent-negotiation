# Concord · project notes for Claude Code

> These rules apply to this repo only. Any global CLAUDE.md (for example Orbital project rules) does not apply here.

Autonomous SG 2026 hackathon, Airbus Challenge 2. Four people. Submission 16:15 today, judging from 16:30, 3-minute demo.
Before doing anything, read:

1. `docs/PROGRESS.md`: what is done, what is next, who is on what. **Start from the first unchecked item under "Next".**
2. `docs/PLAN.md`: features, module interfaces, division of work.
3. GitHub issues #1 to #4: the backend split.

## One sentence

A React page that is both the pitch deck and the demo. The judge picks the conditions (weather, runways, aircraft status, terminal, ramp crew, passengers) and a real flight. Three AI agents (ATC, Pilot, Ground) negotiate, a chief written in code rules, a rulebook in code blocks anything unsafe, max 3 rounds, a human approves at the end. Tagline: The AI can argue, but it can't break the rules.

## Decided. Do not reopen.

- The chief is code, not an LLM. ATC's opinion weighs most, then Pilot, then Ground.
- The only LLM is `claude-haiku-5-5`. Three agents per round, called in parallel, fixed JSON output via tool use. Agents can only reference candidate numbers.
- No Jev.
- Only 4 hard rules: WAKE-01, CAP-01, FUEL-01, GATE-01. CONN-01 is a soft cost, never a veto.
- The backend runs the whole negotiation and returns one JSON. No streaming. The UI plays it back step by step.
- UI text in English. Team docs in English.
- The judge picks environment conditions. The flight, its delay, cause and the arrival queue are real 2015 US DOT data (`data/pool.json`). Gates, fuel, crew, connections and wake category are simulated and tagged SIM on screen.
- Without `ANTHROPIC_API_KEY` or on API error the agents fall back to rules; the demo still runs, `meta.ai_enabled = false`.

## Contracts

The JSON files in `data/` are contracts. UI and backend both follow them. Changing one means changing both sides and noting it in PROGRESS.md.

- `data/sample_log.json`: what `POST /api/run` returns. Field list in `docs/API.md`.
- `data/sample_eval.json`: what the evidence page reads. Written by `scripts/evaluate.py`.
- `data/pool.json`: the real flights the judge can pick. Built by `scripts/build_pool.py`.
- `data/rules.json`: the rule table with sources. Read by the UI and by `src/rules.py`.

## Layout

```
ui/        Vite + React. npm install && npm run dev -> :5173. /api is proxied to :8000. Design notes in ui/DESIGN.md
src/       Python backend: scenario, candidates, rules (done), agents, chief, negotiation, api (issues #3, #4)
scripts/   build_pool.py, evaluate.py
data/      contracts, airlines.csv, airports.csv. flights.csv is not committed
docs/      PROGRESS.md, PLAN.md, API.md, EVAL.md
```

flights.csv (the 358k-row subset) lives one folder above the repo: `../flights.csv`. Copy it to `data/flights.csv` if needed; it is git-ignored.

## How we work

- Small commits, **push every commit**, teammates need to see them.
- Update `docs/PROGRESS.md` ("Done" and "Next") in every commit that changes what is done.
- After a chunk of work, have a subagent review it, then merge to main.
- Never touch `.env` or API keys. Keys live in environment variables, not in git.
- Never commit `data/flights.csv` or `logs/`.

## Code style

Write it like a first-year student would. Readable beats clever.

- Python: snake_case, short functions, modules pass dicts and lists to each other.
- React: JSX, no TypeScript, small components, one component per file, plain CSS.
- Comment a lot, note-to-self style.
- No class hierarchies, no dependency injection, no config framework.
- Clear variable names, not corporate ones.

## Priorities

Rubric: technical soundness 25%, problem realism 20%, honest evaluation 20%, trust and traceability 20%, impact 10%, time discipline 5%.
So: it runs > blocked proposals are visible > evaluation numbers and a failure case > traceability > looks. Animation last.

## Timeline

- 13:30 scenario / candidates / rules (done)
- 14:00 UI talks to the real backend
- 15:00 evaluation numbers
- 15:30 first submission
- 16:15 final submission
