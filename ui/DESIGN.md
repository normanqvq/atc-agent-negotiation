# Concord demo design notes

Judges see many teams in one day and attention is short. One rule: **one screen says one thing**. The presenter just keeps pressing →.

## Flow (follows the 3-minute script in docs/PLAN.md)

| Bottom tab | Screen | What it says |
|---|---|---|
| Problem | Intro | The problem, the three desks, the rulebook, the human signature |
| Live run | Set the conditions | Judge picks weather, runways and so on, plus a real flight, presses Run (or →) |
| Live run | Negotiating live | Animation after Run: data → code builds candidates → three Haiku calls → rule gate → chief → plan. The timer on the right counts for real while waiting for the backend, then freezes at the backend's `meta.elapsed_s`, then the log plays step by step |
| Live run | Flight + timeline | How late this flight is, which candidate slots the code generated |
| Live run | Round 1 | One line from each agent |
| Live run | Blocked | A proposal the rules stopped, enlarged: rule, source, the chief's compromise |
| Live run | Round 2 ... | One screen per round |
| Live run | Plan | The final plan in huge type, Approve / Override |
| Trust | Trace | Which message or rule each part of the plan comes from |
| Failure | Where it fails | The failure case from the evaluation data |
| Evidence | What we measured | Three numbers, the comparison with FCFS and the upper bound |
| Evidence | Close | Tagline, stay here for Q&A |

The number of Live run screens is computed from the backend log: one Round screen per round, one Blocked screen per blocked proposal.

## Layout

- Landscape 16:9 only, light theme only. Every screen sits on a fixed 1600x900 stage that `App.jsx` scales. No `vw`/`vh`, no media queries.
- Keyboard: → / PageDown next, ← / PageUp previous (a presenter clicker works).
- With the backend down the UI plays `data/sample_log.json`, so the demo still runs.

## Visual language

- Red sign with white text `.sign--stop`: **only** for a proposal blocked by a rule and for No safe plan
- Black sign with yellow text `.sign--code` and the black chief bar: things the code does
- Blue: LLM agents. Green: the human (Approve)
- Fonts: Barlow Condensed for headings, Barlow for body, JetBrains Mono only for data (flight numbers, times, rule ids)

Do not add more to a screen. Before adding anything ask: can a judge read it in 3 seconds?
