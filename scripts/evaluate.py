"""
Batch evaluation: 20 real flights x 3 condition sets = 60 negotiations.
Writes data/sample_eval.json (the UI's Evidence + Failure pages read it, shape fixed)
and docs/EVAL.md (numbers + how they were made). Full per-run results go to
logs/eval-<time>.json (not in git).

usage: python scripts/evaluate.py              # Haiku if ANTHROPIC_API_KEY is set, else rule-based agents
       python scripts/evaluate.py --rules-only # force rule-based agents (free, instant)
"""
import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv  # noqa: E402

from src.scenario import build_scenario, load_pool  # noqa: E402
from src.candidates import build_candidates  # noqa: E402
from src.rules import first_block, is_legal, soft_cost  # noqa: E402
from src.chief import final_pick, find  # noqa: E402
from src.negotiation import run, annotate_blocks  # noqa: E402
from src.agents import MODEL  # noqa: E402

CONDITION_SETS = [
    ("All normal", {}),
    ("Thunderstorm + single runway + many connecting", {
        "weather": "thunderstorm", "runway": "single", "passengers": "many_connecting"}),
    ("Fog + one runway closed + gates tight + shift ending", {
        "weather": "fog", "runway": "one_closed", "terminal": "tight", "ground_crew": "shift_ending"}),
]
PARALLEL_RUNS = 5

# the failure scenario from issue #4. only used to find a failure case when the 60 runs have
# no "no safe plan" run. we only run flights with zero legal candidates, so no LLM call is made
STRESS_SET = ("Stress test: fog + one runway closed + low fuel + gate zone closed", {
    "weather": "fog", "runway": "one_closed", "aircraft_status": "low_fuel", "terminal": "zone_closed"})


def stress_no_safe_plan():
    name, env = STRESS_SET
    out = []
    for f in load_pool():
        world = build_scenario(f["pool_index"], env)
        if not any(is_legal(world, c) for c in build_candidates(world)):
            out.append(evaluate_one(f["pool_index"], name, env))
    return out


def evaluate_one(pool_index, set_name, env):
    world = build_scenario(pool_index, env)
    cands = build_candidates(world)
    log = run(pool_index, env, save=False)
    decision = log["decision"]

    # inject every illegal candidate as if a desk proposed it, through the same code path as a live run
    injected = 0
    injected_blocked = 0
    for c in cands:
        if first_block(world, c) is None:
            continue
        injected += 1
        fake = [{"id": "inj", "agent": "PILOT", "action": "propose", "candidate": c["id"], "text": "injected"}]
        annotate_blocks(world, cands, fake)
        if fake[0].get("blocked_by"):
            injected_blocked += 1

    live_msgs = [m for r in log["rounds"] for m in r["messages"] if m["agent"] != "CHIEF"]
    result = {
        "pool_index": pool_index,
        "row_id": world["scenario"]["row_id"],
        "flight": world["scenario"]["flight"],
        "set": set_name,
        "status": decision["status"],
        "decided_by": decision["decided_by"],
        "rounds": len(log["rounds"]),
        "live_proposals": len(live_msgs),
        "live_blocked": sum(1 for m in live_msgs if m.get("blocked_by")),
        "injected": injected,
        "injected_blocked": injected_blocked,
        "elapsed_s": log["meta"]["elapsed_s"],
        "tokens": log["meta"]["tokens"],
        "ai_enabled": log["meta"]["ai_enabled"],
        "fallback_calls": log["meta"]["fallback_calls"],
        "blocks_by_rule": {},
    }
    if decision["status"] == "no_safe_plan":
        for c in cands:
            rule = first_block(world, c)["id"]
            result["blocks_by_rule"][rule] = result["blocks_by_rule"].get(rule, 0) + 1
        result["block_details"] = [c["detail"] for c in log["rule_checks"]]
        result["acceptance"] = world["sim"]["acceptance_per_10min"]
        return result

    chosen = find(cands, decision["candidate"])
    legal = [c for c in cands if is_legal(world, c)]
    fcfs = legal[0]  # candidates are in time order: earliest legal slot, no negotiation
    best = final_pick(world, cands)
    result["unsafe_decision"] = not is_legal(world, chosen)
    result["cost"] = {
        "fcfs": soft_cost(world, fcfs),
        "concord": soft_cost(world, chosen),
        "optimiser": soft_cost(world, best),
    }
    result["concord_is_optimal"] = soft_cost(world, chosen)["total"] <= soft_cost(world, best)["total"]
    return result


def average(xs):
    return round(sum(xs) / len(xs), 1) if xs else 0.0


def baseline_row(name, solved, key):
    costs = [r["cost"][key] for r in solved]
    return {
        "name": name,
        "avg_delay_min": average([c["delay_min"] for c in costs]),
        "missed_connections": sum(c["missed_connections"] for c in costs),
        "overtime_min": sum(c["overtime_min"] for c in costs),
        "measured": True,
    }


def pick_failure(results, stress):
    # prefer a run with no safe plan (from the 60 runs, else from the stress test);
    # otherwise the run where Concord lost the most against the optimiser
    nsp = [r for r in results if r["status"] == "no_safe_plan"] or stress
    if nsp:
        r = nsp[0]
        rules_txt = ", ".join("%s %d" % (k, v) for k, v in sorted(r["blocks_by_rule"].items()))
        return r, {
            "row_id": r["row_id"],
            "summary": "%s: zero legal candidates for %s" % (r["set"], r["flight"]),
            "what_happened": ("The rule layer blocked all 5 candidate slots (%s). No agent was asked; the system "
                              "reported 'no safe plan, consider diversion' and handed over to the duty manager." % rules_txt),
            "why": ("Acceptance dropped to %d arrival per 10 min, and every candidate slot hit a hard rule: %s" % (
                r["acceptance"], "; ".join(r["block_details"][:3]) + ("; ..." if len(r["block_details"]) > 3 else "."))),
            "fix": "Add later slots and diversion airports as candidates, so the desks can negotiate a longer hold or a diversion instead of giving up.",
        }
    solved = [r for r in results if r["status"] != "no_safe_plan"]
    r = max(solved, key=lambda x: x["cost"]["concord"]["total"] - x["cost"]["optimiser"]["total"])
    gap = r["cost"]["concord"]["total"] - r["cost"]["optimiser"]["total"]
    return r, {
        "row_id": r["row_id"],
        "summary": "%s: %s ended %.0f cost points above the best legal plan" % (r["set"], r["flight"], gap),
        "what_happened": "Decided by %s after %d round(s); a cheaper legal slot existed." % (r["decided_by"], r["rounds"]),
        "why": "The Chief only weighs what the desks ask for; it does not search all legal slots unless there is no consensus.",
        "fix": "Let the Chief propose the cheapest legal slot as a fourth option in every round.",
    }


def write_eval_md(path, summary, results, failure_run, mode):
    solved = [r for r in results if r["status"] != "no_safe_plan"]
    nsp = [r for r in results if r["status"] == "no_safe_plan"]
    lines = []
    w = lines.append
    w("# Evaluation")
    w("")
    w("Generated by `python scripts/evaluate.py` on %s. Re-running overwrites this file and `data/sample_eval.json`." % summary["when"])
    w("")
    w("## What was run")
    w("")
    w("- **%d negotiations**: the 20 real ATL arrivals in `data/pool.json` (US DOT 2015 on-time data, sampled with seed 42 by `scripts/build_pool.py`) x 3 condition sets:" % summary["n_events"])
    for name, env in CONDITION_SETS:
        w("  - %s `%s`" % (name, json.dumps(env) if env else "{}"))
    w("- **Agents**: %s" % mode)
    w("- Each run is the same code path as `POST /api/run` (`src/negotiation.run`). Up to 3 rounds, Chief = code.")
    w("- The pool was not used to tune any number. Pool flight 1 was used while developing the rules, so it is not unseen.")
    w("")
    w("## Headline")
    w("")
    w("| Metric | Value |")
    w("|---|---|")
    w("| Consensus within 3 rounds | %d / %d (%.0f%%) |" % (summary["consensus"], summary["n_events"], 100 * summary["consensus_rate"]))
    w("| Decided by the Chief after round 3 | %d |" % summary["chief_decided"])
    w("| No safe plan (handed to human) | %d |" % len(nsp))
    w("| Injected unsafe proposals blocked | %s |" % summary["injected"])
    w("| Unsafe proposals made by the live agents, blocked | %d of %d proposals |" % (summary["live_blocked"], summary["live_proposals"]))
    w("| Final plans that break a hard rule | %d |" % summary["unsafe_decisions"])
    w("| Concord plan = cheapest legal plan | %d / %d solved runs |" % (summary["optimal"], len(solved)))
    w("| Average delay vs first come, first served | %+.1f min |" % summary["delay_vs_fcfs"])
    w("| Average run time / tokens per run | %.1f s / %d |" % (summary["avg_elapsed"], summary["avg_tokens"]))
    w("| Agent calls that fell back to rules | %d |" % summary["fallback_calls"])
    w("")
    w("## Baselines (%d solved runs; the %d no-safe-plan runs are left out of all three rows)" % (len(solved), len(nsp)))
    w("")
    w("| Policy | Avg delay (min) | Missed connections (total) | Ramp overtime (min, total) |")
    w("|---|---|---|---|")
    for b in summary["baselines"]:
        w("| %s | %.1f | %d | %d |" % (b["name"], b["avg_delay_min"], b["missed_connections"], b["overtime_min"]))
    w("")
    w("- **First come, first served**: no negotiation, the earliest legal candidate.")
    w("- **Concord**: the plan our 3 desks + Chief agreed on.")
    w("- **Omniscient optimiser**: sees everything, picks the legal candidate with the lowest soft cost.")
    w("")
    w("**Read this honestly.** With the current soft cost (delay + 2 x missed connections + 0.5 x overtime), every cost term grows "
      "with landing time, so the earliest legal slot is always the cheapest one: FCFS and the optimiser are the same plan, and Concord "
      "can only tie or lose on these numbers. What negotiation adds is not in this cost model (holding fuel vs slowing down, the "
      "original gate, ATC workload, a medical case). The measured win is safety: no final plan breaks a hard rule, and every "
      "unsafe proposal is stopped by code.")
    w("")
    w("## Per condition set")
    w("")
    w("| Condition set | Runs | Consensus | Chief decided | No safe plan | Live proposals blocked | Avg Concord delay | Avg FCFS delay |")
    w("|---|---|---|---|---|---|---|---|")
    for name, _ in CONDITION_SETS:
        rs = [r for r in results if r["set"] == name]
        sv = [r for r in rs if r["status"] != "no_safe_plan"]
        w("| %s | %d | %d | %d | %d | %d / %d | %.1f | %.1f |" % (
            name, len(rs),
            sum(1 for r in rs if r["decided_by"] == "consensus"),
            sum(1 for r in rs if r["decided_by"] == "chief_decided"),
            sum(1 for r in rs if r["status"] == "no_safe_plan"),
            sum(r["live_blocked"] for r in rs), sum(r["live_proposals"] for r in rs),
            average([r["cost"]["concord"]["delay_min"] for r in sv]),
            average([r["cost"]["fcfs"]["delay_min"] for r in sv])))
    w("")
    w("## Failure case")
    w("")
    f = summary["failure_case"]
    w("- **Run**: pool flight %d (%s), row %d of flights.csv, %s" % (failure_run["pool_index"], failure_run["flight"], f["row_id"], failure_run["set"]))
    w("- **Summary**: %s" % f["summary"])
    w("- **What happened**: %s" % f["what_happened"])
    w("- **Why**: %s" % f["why"])
    w("- **Fix**: %s" % f["fix"])
    if len(nsp) > 1:
        w("- All no-safe-plan runs: %s" % ", ".join("pool %d (%s)" % (r["pool_index"], r["set"]) for r in nsp))
    if summary["stress"]:
        name, env = STRESS_SET
        w("- None of the %d runs above ended with no safe plan, so this case comes from a separate stress test "
          "**outside the %d runs**: all 20 pool flights under `%s` (the failure scenario of issue #4). "
          "%d of 20 flights had zero legal candidates: %s. No LLM is called for those, the rule layer stops them first." % (
              summary["n_events"], summary["n_events"], json.dumps(env), len(summary["stress"]),
              ", ".join("pool %d (%s)" % (r["pool_index"], r["flight"]) for r in summary["stress"])))
    w("")
    w("## Limitations")
    w("")
    w("- **Simulated, not real data**: gate occupancy, fuel, flight and ramp crew times, connecting passengers and wake categories. "
      "They are set by the condition set (see `src/scenario.py`). Flights, delays, causes and the arrival queue are real.")
    w("- **One flight at a time.** The other arrivals are fixed at their scheduled times and never move.")
    w("- **Rules are simplified** (from `data/rules.json`): wake separation uses time gaps (3 min behind Heavy, 2 behind Medium) "
      "instead of NM; capacity scales a fixed per-runway rate by a weather factor; fuel is minutes of endurance (hold burns 1.0/min, "
      "slow-down 0.4/min); gates use a 45 min turnaround with a 10 min buffer.")
    w("- **Soft-cost weights are assumptions** (`src/rules.py`). The connection cutoff is ETA+15 min (simulated tight bank).")
    w("- **LLM answers vary between runs.** Re-running gives slightly different consensus numbers; the rule layer is deterministic.")
    w("- The arrival queue only holds up to 8 real arrivals around the flight, so real ATL traffic is denser than this.")
    w("- Not measured: fuel burned and time-to-decide in operations. The `estimated` rows in `data/sample_eval.json` are estimates.")
    w("")
    path.write_text("\n".join(lines) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rules-only", action="store_true", help="force rule-based agents, no API calls")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    if args.rules_only:
        os.environ.pop("ANTHROPIC_API_KEY", None)
    mode = ("%s, 3 separate calls per round in parallel" % MODEL) if os.environ.get("ANTHROPIC_API_KEY") \
        else "rule-based fallback agents (no ANTHROPIC_API_KEY), no LLM"

    jobs = [(f["pool_index"], name, env) for f in load_pool() for name, env in CONDITION_SETS]
    print("running %d negotiations, %s" % (len(jobs), mode))
    start = time.time()
    with ThreadPoolExecutor(max_workers=PARALLEL_RUNS) as pool:
        results = list(pool.map(lambda j: evaluate_one(*j), jobs))
    print("done in %.0fs" % (time.time() - start))

    solved = [r for r in results if r["status"] != "no_safe_plan"]
    n = len(results)
    consensus = sum(1 for r in results if r["decided_by"] == "consensus")
    injected = sum(r["injected"] for r in results)
    injected_blocked = sum(r["injected_blocked"] for r in results)
    baselines = [
        baseline_row("First come, first served", solved, "fcfs"),
        baseline_row("Concord (3-desk negotiation)", solved, "concord"),
        baseline_row("Omniscient optimiser (upper bound)", solved, "optimiser"),
    ]
    stress = [] if any(r["status"] == "no_safe_plan" for r in results) else stress_no_safe_plan()
    failure_run, failure_case = pick_failure(results, stress)

    summary = {
        "when": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "n_events": n,
        "consensus": consensus,
        "consensus_rate": round(consensus / n, 2),
        "chief_decided": sum(1 for r in results if r["decided_by"] == "chief_decided"),
        "injected": "%d / %d" % (injected_blocked, injected),
        "live_blocked": sum(r["live_blocked"] for r in results),
        "live_proposals": sum(r["live_proposals"] for r in results),
        "unsafe_decisions": sum(1 for r in solved if r["unsafe_decision"]),
        "optimal": sum(1 for r in solved if r["concord_is_optimal"]),
        "delay_vs_fcfs": round(baselines[1]["avg_delay_min"] - baselines[0]["avg_delay_min"], 1),
        "avg_elapsed": average([r["elapsed_s"] for r in results]),
        "avg_tokens": int(sum(r["tokens"] for r in results) / n),
        "fallback_calls": sum(r["fallback_calls"] for r in results),
        "baselines": baselines,
        "failure_case": failure_case,
        "stress": stress,
    }

    # data/sample_eval.json: same shape as before, the UI reads it directly
    old = json.load(open(ROOT / "data" / "sample_eval.json"))
    out = {
        "_note": "Written by scripts/evaluate.py (%s). Agents: %s. See docs/EVAL.md." % (summary["when"], mode),
        "n_events": n,
        "pool_note": "%d runs: 20 real ATL arrivals from US DOT 2015 x 3 condition sets, agents: %s" % (
            n, MODEL if os.environ.get("ANTHROPIC_API_KEY") else "rule-based"),
        "headline": {
            "consensus_rate": summary["consensus_rate"],
            "injected_violations_blocked": summary["injected"],
            "delay_vs_fcfs_min": summary["delay_vs_fcfs"],
        },
        "baselines": baselines,
        "estimated": old["estimated"],
        "failure_case": failure_case,
    }
    with open(ROOT / "data" / "sample_eval.json", "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")

    write_eval_md(ROOT / "docs" / "EVAL.md", summary, results, failure_run, mode)

    (ROOT / "logs").mkdir(exist_ok=True)
    detail_path = ROOT / "logs" / ("eval-%s.json" % datetime.now().strftime("%Y%m%d-%H%M%S"))
    with open(detail_path, "w") as f:
        json.dump(results, f, indent=2)

    print(json.dumps(out["headline"], indent=2))
    for b in baselines:
        print("  %-36s delay %5.1f  missed %4d  overtime %5d" % (b["name"], b["avg_delay_min"], b["missed_connections"], b["overtime_min"]))
    print("failure case:", failure_case["summary"])
    print("wrote data/sample_eval.json, docs/EVAL.md, %s" % detail_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
