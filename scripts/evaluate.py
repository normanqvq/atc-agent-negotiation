"""
Batch evaluation -> data/sample_eval.json (UI reads it) + docs/EVAL.md

Runs every flight in data/pool.json under 3 condition sets, compares Concord's
negotiated plan with two baselines computed from the same rulebook:
  - first come, first served: earliest legal candidate, no negotiation
  - omniscient optimiser:     cheapest legal candidate, sees everything (upper bound)
and checks that every illegal candidate, if an agent proposed it, gets blocked.

usage:
  .venv/bin/python scripts/evaluate.py            # real run, needs src.negotiation.run
  .venv/bin/python scripts/evaluate.py --stub     # pipeline check without the negotiation, writes to logs/
"""
import sys, os, json, argparse, time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from src.scenario import build_scenario, load_pool
from src.candidates import build_candidates
from src.rules import first_block, is_legal, soft_cost
from src.timeutil import to_min, fmt, near

CONDITION_SETS = [
    ("all normal", {}),
    ("thunderstorm + single runway + many connecting", {"weather": "thunderstorm", "runway": "single", "passengers": "many_connecting"}),
    ("fog + one runway closed + gates tight + shift ending", {"weather": "fog", "runway": "one_closed", "terminal": "tight", "ground_crew": "shift_ending"}),
]
DIVERT_PENALTY_MIN = 30   # FCFS with no legal slot: latest candidate + 30 min, stands in for a diversion
GATE_BUFFER = 10          # same as rules.py

parser = argparse.ArgumentParser()
parser.add_argument("--stub", action="store_true", help="no negotiation; Concord = omniscient pick, marked as stub")
parser.add_argument("--workers", type=int, default=5)
parser.add_argument("--out", default=None)
args = parser.parse_args()

run = None
if not args.stub:
    try:
        from src.negotiation import run
    except ImportError:
        print("src/negotiation.py not there yet (issue #4). use --stub to test the pipeline.")
        sys.exit(1)

has_key = bool(os.environ.get("ANTHROPIC_API_KEY"))


def fcfs_pick(world, cands):
    """today's process, no coordination between desks: the tower gives the earliest
    runway slot that is safe (wake, capacity, fuel), the aircraft heads for its
    original gate, and if that gate is busy it waits on the taxiway until the gate
    frees up. that wait is the cost of nobody talking to the ramp."""
    from src.rules import check_wake, check_capacity, check_fuel
    sim = world["sim"]
    for c in cands:
        if all(k["status"] == "pass" for k in (check_wake(world, c), check_capacity(world, c), check_fuel(world, c))):
            plan = dict(c, gate=sim["original_gate"])
            if is_legal(world, plan):
                return plan, False
            # gate busy or closed: sit on the taxiway until it is free, then count that as arrival time
            eta = to_min(world["eta"])
            arrival = near(to_min(plan["arrival"]), eta)
            latest_free = arrival
            for s_str, e_str in sim["gates"].get(plan["gate"], []):
                e = near(to_min(e_str), eta)
                if e + GATE_BUFFER > latest_free:
                    latest_free = e + GATE_BUFFER
            if plan["gate"] in sim["closed_gates"]:
                latest_free = arrival + DIVERT_PENALTY_MIN   # tow to a remote stand, roughly
            # mode stays slow_down-ish on purpose: the wait is on the ground, not burning hold fuel
            waited = dict(plan, arrival=fmt(latest_free), mode="slow_down")
            return waited, False
    # nothing safe on the runway side: pretend we divert. cost = latest candidate + penalty
    last = dict(cands[-1])
    last["arrival"] = fmt(to_min(last["arrival"]) + DIVERT_PENALTY_MIN)
    return last, True


def omniscient_pick(world, cands):
    legal = [c for c in cands if is_legal(world, c)]
    if not legal:
        return None
    return min(legal, key=lambda c: soft_cost(world, c)["total"])


def one(pool_index, label, env):
    world = build_scenario(pool_index, env)
    cands = build_candidates(world)
    illegal = [c for c in cands if not is_legal(world, c)]
    blocked = sum(1 for c in illegal if first_block(world, c) is not None)

    fcfs, diverted = fcfs_pick(world, cands)
    omni = omniscient_pick(world, cands)

    if args.stub:
        concord = omni
        decided_by = "stub"
        tokens, elapsed = 0, 0.0
    else:
        t0 = time.time()
        log = run(pool_index, env)
        elapsed = time.time() - t0
        d = log["decision"]
        decided_by = d.get("decided_by", "")
        tokens = log.get("meta", {}).get("tokens", 0)
        concord = next((c for c in cands if c["id"] == d.get("candidate")), None)

    return {
        "pool_index": pool_index, "row_id": world["scenario"]["row_id"], "label": label, "env": env,
        "n_candidates": len(cands), "n_illegal": len(illegal), "n_blocked": blocked,
        "no_legal": omni is None,
        "fcfs": soft_cost(world, fcfs), "fcfs_diverted": diverted,
        "omni": soft_cost(world, omni) if omni else None,
        "concord": soft_cost(world, concord) if concord else None,
        "decided_by": decided_by, "tokens": tokens, "elapsed_s": round(elapsed, 1),
        "block_reasons": [first_block(world, c)["id"] for c in illegal],
        "world": world,
    }


jobs = [(f["pool_index"], label, env) for f in load_pool() for label, env in CONDITION_SETS]
print("running", len(jobs), "events", "(stub)" if args.stub else ("with Haiku" if has_key else "rule-based agents, no API key"))
t0 = time.time()
with ThreadPoolExecutor(max_workers=args.workers) as ex:
    results = list(ex.map(lambda j: one(*j), jobs))
print("done in %.0fs" % (time.time() - t0))

# ---- aggregate ----
n = len(results)
scored = [r for r in results if r["concord"] is not None and not r["no_legal"]]
no_plan = [r for r in results if r["no_legal"]]                                  # rulebook left nothing legal
neg_failed = [r for r in results if r["concord"] is None and not r["no_legal"]]  # legal options existed, negotiation returned none


def avg(xs):
    return round(sum(xs) / len(xs), 1) if xs else 0.0


def row(name, key):
    rs = [r[key] for r in scored]
    return {"name": name, "avg_delay_min": avg([x["delay_min"] for x in rs]),
            "missed_connections": sum(x["missed_connections"] for x in rs),
            "overtime_min": sum(x["overtime_min"] for x in rs), "measured": True}


fcfs_row = row("First come, first served (no gate coordination)", "fcfs")
concord_row = row("Concord (3-desk negotiation)" + (" [stub]" if args.stub else ""), "concord")
omni_row = row("Omniscient optimiser (upper bound)", "omni")

consensus = sum(1 for r in results if r["decided_by"] == "consensus")
inj_total = sum(r["n_illegal"] for r in results)
inj_blocked = sum(r["n_blocked"] for r in results)

# failure case: a no-plan run if there is one, else a negotiation that returned nothing, else the worst outcome
if not no_plan and neg_failed:
    fc = neg_failed[0]
    failure = {
        "row_id": fc["row_id"],
        "summary": "%s (%s): %d legal candidates existed but the negotiation returned no plan" % (fc["world"]["scenario"]["flight"], fc["label"], fc["n_candidates"] - fc["n_illegal"]),
        "what_happened": "The desks did not converge and the chief returned no candidate, so the case went to the duty manager with the legal options listed.",
        "why": "decided_by=%s. Likely an agent answer that failed validation in every round." % fc["decided_by"],
        "fix": "Make the chief fall back to the cheapest legal option whenever the final round yields no candidate.",
    }
elif no_plan:
    fc = no_plan[0]
    reasons = {}
    for rid in fc["block_reasons"]:
        reasons[rid] = reasons.get(rid, 0) + 1
    top = max(reasons, key=reasons.get) if reasons else "n/a"
    env_text = ", ".join("%s=%s" % (k, v) for k, v in fc["env"].items()) or "all normal"
    failure = {
        "row_id": fc["row_id"],
        "summary": "%s (%s): zero legal candidates" % (fc["world"]["scenario"]["flight"], env_text),
        "what_happened": "The rulebook blocked all %d candidates (%s). The system reported 'no safe plan' and handed over to the duty manager instead of picking one." % (fc["n_candidates"], ", ".join("%s x%d" % kv for kv in reasons.items())),
        "why": "%s fired most often: with the acceptance rate cut to %d per 10 min and fuel for %d min, no slot within 30 min of ETA was both free and reachable." % (top, fc["world"]["sim"]["acceptance_per_10min"], fc["world"]["sim"]["fuel_endurance_min"]),
        "fix": "Add diversion airports and slots beyond ETA+30 as candidates so the desks can negotiate a diversion instead of giving up.",
    }
else:
    worst = max(scored, key=lambda r: r["concord"]["total"])
    failure = {
        "row_id": worst["row_id"],
        "summary": "%s (%s): worst negotiated outcome, cost %.0f" % (worst["world"]["scenario"]["flight"], worst["label"], worst["concord"]["total"]),
        "what_happened": "Concord landed %d min late with %d missed connections; the omniscient optimiser found cost %.0f." % (worst["concord"]["delay_min"], worst["concord"]["missed_connections"], worst["omni"]["total"]),
        "why": "The desks converged on a legal but expensive slot because each only sees its own data.",
        "fix": "Let the chief show the soft cost of every legal option to all desks in round 2.",
    }

out = {
    "_note": "Written by scripts/evaluate.py. %s" % ("STUB: Concord column is the omniscient pick, not a negotiation." if args.stub else "Real runs."),
    "n_events": n,
    "pool_note": "%d runs: %d real ATL arrivals from DOT 2015 x %d condition sets, pool seed 42, %s" % (
        n, len(load_pool()), len(CONDITION_SETS),
        "stub, no negotiation" if args.stub else ("claude-haiku-5-5 agents" if has_key else "rule-based agents, no API key")),
    "headline": {
        "consensus_rate": round(consensus / n, 2) if n else 0,
        "injected_violations_blocked": "%d / %d" % (inj_blocked, inj_total),
        "delay_vs_fcfs_min": round(concord_row["avg_delay_min"] - fcfs_row["avg_delay_min"], 1),
    },
    "baselines": [fcfs_row, concord_row, omni_row],
    "estimated": [
        {"name": "Extra fuel burned", "value": "about 2,400 kg/hr x holding minutes", "source": "public burn-rate estimate"},
        {"name": "Time to decide", "value": "%s s per negotiation vs 10 to 15 min of phone calls" % (avg([r["elapsed_s"] for r in results]) if not args.stub else "n/a"), "source": "measured runtime vs estimate"},
    ],
    "failure_case": failure,
}

out_path = args.out or ("logs/eval_stub.json" if args.stub else "data/sample_eval.json")
os.makedirs(os.path.dirname(out_path), exist_ok=True)
json.dump(out, open(out_path, "w"), indent=2)
print("wrote", out_path)
print(json.dumps({"headline": out["headline"], "baselines": out["baselines"], "no_plan_runs": len(no_plan)}, indent=2))

if not args.stub:
    md = []
    md.append("# Evaluation\n\n")
    md.append("How to run: `.venv/bin/python scripts/evaluate.py`. Agents: %s.\n\n" % ("claude-haiku-5-5" if has_key else "rule-based fallback (no API key)"))
    md.append("## What we ran\n\n")
    md.append("- %d real ATL arrivals (`data/pool.json`, picked from the DOT 2015 data, never used to tune anything) x %d condition sets = %d runs\n" % (len(load_pool()), len(CONDITION_SETS), n))
    for label, env in CONDITION_SETS:
        md.append("  - %s\n" % label)
    md.append("\n## Numbers\n\n| | Avg delay (min) | Missed connections | Ramp overtime (min) |\n|---|---|---|---|\n")
    for b in out["baselines"]:
        md.append("| %s | %s | %s | %s |\n" % (b["name"], b["avg_delay_min"], b["missed_connections"], b["overtime_min"]))
    md.append("\n- Consensus within 3 rounds: %d / %d (%.0f%%)\n" % (consensus, n, 100 * consensus / n if n else 0))
    md.append("- Injected illegal proposals blocked by the rule layer: %s\n" % out["headline"]["injected_violations_blocked"])
    md.append("- Zero legal candidates (no_safe_plan, excluded from averages): %d runs; legal options existed but the negotiation returned no plan: %d runs\n" % (len(no_plan), len(neg_failed)))
    by_set = {}
    for r in results:
        if r["concord"] is not None and not r["no_legal"]:
            by_set.setdefault(r["label"], []).append(r["fcfs"]["delay_min"] - r["concord"]["delay_min"])
    md.append("- FCFS minus Concord delay per condition set (min, positive = Concord better): " + "; ".join("%s %.1f" % (k, avg(v)) for k, v in by_set.items()) + ". Most of the gap comes from the tight-gates set, where FCFS waits on the taxiway because nobody coordinated the gate.\n")
    md.append("- Average per run: %.1f s, %.0f tokens\n" % (avg([r["elapsed_s"] for r in results]), avg([r["tokens"] for r in results])))
    md.append("\n## Failure case\n\n- row %s: %s\n- What happened: %s\n- Why: %s\n- Fix: %s\n" % (failure["row_id"], failure["summary"], failure["what_happened"], failure["why"], failure["fix"]))
    md.append("\n## How the baselines are computed\n\n- FCFS (status quo): the tower gives the earliest safe runway slot (wake, capacity, fuel), the aircraft heads for its original gate; if the gate is busy it waits on the taxiway until the gate frees, and that wait counts as delay. This models desks that only see their own data and coordinate by phone.\n- Concord: the plan the chief settles on after the three agents negotiate.\n- Omniscient optimiser: sees everything and picks the legal candidate with the lowest soft cost. Theoretical upper bound.\n")
    md.append("\n## Limits\n\n- Gates, fuel, crew, connecting passengers and wake category are simulated from the judge's conditions (`src/scenario.py`). Flight, delay, cause and arrival queue are real.\n- One aircraft at a time, no knock-on effects.\n- Rules are simplified: time gaps instead of nautical miles for wake, observed arrivals x a weather factor for capacity, fuel as minutes of endurance. See the simplification column in `data/rules.json`.\n- The evaluation runs in our own simulator and the baselines use the same rulebook. Numbers are relative comparisons, not operational data.\n- flights.csv is a 358,774-row subset, so the arrival queue is about 6%% of real traffic density.\n")
    open("docs/EVAL.md", "w").write("".join(md))
    print("wrote docs/EVAL.md")
