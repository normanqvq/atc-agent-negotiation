# Hooking up the API and testing the full loop

Everything is on `main`. Without a key the agents answer from rules (`ai_enabled: false`); with a key they call `claude-haiku-5-5`. Nobody has run the real Haiku path yet, so this is the one test that matters.

## 1. Set the key (once)

```bash
git checkout main && git pull
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env     # .env is git-ignored, never commit it
```

`src/agents.py` loads `.env` at import, so uvicorn, evaluate.py and the CLI all see it. Exporting the variable in the shell works too.

## 2. Three agents, one round (30 seconds)

```bash
.venv/bin/python -m src.agents
```

Expect three lines (ATC rank, PILOT propose, GROUND propose), then `usage {'tokens': <some number>, 'ai_enabled': True, 'fallback_calls': 0} took 2-6s`.

- `ai_enabled: False` or `fallback_calls > 0`: a call failed. stderr has a line `[agents] ATC round 1 fell back to rules: <reason>`. Paste that line in this issue.
- Took more than 10 s: the calls are not running in parallel or the network is slow. Say so here.

## 3. One full negotiation (1 minute)

```bash
.venv/bin/python -m src.main --pool 16 --weather thunderstorm --runway single --passengers many_connecting
```

Expect: round 1 with at least one `[BLOCKED CAP-01]`, a chief compromise, round 2 accepts, `AI True`, tokens in the hundreds or thousands, a few seconds elapsed. Agent text should be one English sentence each with a number from its own data. If a sentence is nonsense or references a candidate that does not exist, paste it here.

## 4. The UI live (5 minutes)

Terminal 1:

```bash
.venv/bin/uvicorn src.api:app --port 8000
```

Terminal 2:

```bash
cd ui && npm install && npm run dev      # http://localhost:5173
```

Walk the three scenarios from the first screen to the last with → (press Run on the setup screen):

| Scenario | Settings | Expect |
|---|---|---|
| Normal | all normal, any flight | consensus in 1 or 2 rounds, Plan screen, Approve works |
| Blocked | Thunderstorm + Single runway + Many connecting | a red Blocked screen with the rule id and source, chief compromise, consensus |
| No plan | Fog + One closed + Low fuel + Zone closed | "No safe plan", no white screen |

Check on the Live screen: the timer shows real seconds (not 6.4) and a token count; the Situation screen shows the flight you picked (not DL1234); every Trace card has content. Post one screenshot per scenario here.

Then stop uvicorn and press Run again: the UI must replay the sample (REPLAY in the corner) and still walk to the end. This is the fallback if the venue network dies.

## 5. Real evaluation numbers (5 to 10 minutes, a few cents)

```bash
.venv/bin/python scripts/evaluate.py
git checkout -b eval-haiku
git add data/sample_eval.json docs/EVAL.md
git commit -m "eval: 60 runs with Haiku agents"
git push -u origin eval-haiku
```

Open a PR. The Evidence and Failure screens read these files. Consensus below 100% and Concord below the upper bound is expected and fine; the rule-based numbers currently in main are too perfect because all three desks pick the same option.

## What to report here

- Step 2 output (the usage line)
- Step 3: `AI True/False`, tokens, elapsed
- Step 4: three screenshots, and whether replay mode worked with the backend off
- Step 5: the PR link
