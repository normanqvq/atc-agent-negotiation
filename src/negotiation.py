"""
One full negotiation, start to end. Returns one dict with exactly the shape
of data/sample_log.json (the UI does not check fields, a missing one breaks a page).

world -> 5 candidates -> up to 3 rounds of (3 agents in parallel -> rule layer -> Chief)
-> decision for a human to sign. No streaming: the UI plays the log back.
"""
import json
import time
from datetime import datetime

from src.scenario import ROOT, DIMENSIONS, build_scenario, to_min
from src.candidates import build_candidates
from src.rules import check_all, first_block, is_legal
from src.agents import AGENTS, MODEL, ask_agents
from src.chief import rule_on_round, final_pick, find

MAX_ROUNDS = 3
LOG_DIR = ROOT / "logs"


def environment_block(env):
    # UI shape: {"weather": {"value", "label", "options"}, ...}
    out = {}
    for key, options in DIMENSIONS.items():
        labels = dict(options)
        out[key] = {"value": env[key], "label": labels[env[key]], "options": [v for v, _ in options]}
    return out


def mode_text(world, cand):
    late = to_min(cand["arrival"]) - to_min(world["eta"])
    late = late % (24 * 60)
    if cand["mode"] == "hold":
        return "hold %d min" % late
    if late == 0:
        return "no holding needed"
    return "slow down %d min instead of holding" % late


def summary_for(world, cand):
    return "Land %s · Gate %s · %s" % (cand["arrival"], cand["gate"], mode_text(world, cand))


def annotate_blocks(world, candidates, messages):
    # run the rulebook over every proposal. blocked ones get blocked_by, and we
    # return the blocking checks with message_id so the UI can show them in sync
    blocked_checks = []
    for m in messages:
        block = first_block(world, find(candidates, m["candidate"]))
        if block:
            m["blocked_by"] = block["id"]
            blocked_checks.append(dict(block, message_id=m["id"]))
    return blocked_checks


def last_message(rounds, agent, cand_id):
    # id of the latest unblocked message from this desk that points at cand_id
    found = None
    for r in rounds:
        for m in r["messages"]:
            if m["agent"] == agent and m["candidate"] == cand_id and not m.get("blocked_by"):
                found = m["id"]
    return found


def build_trace(world, rounds, cand):
    # every part of the plan links to the message and rule check behind it
    chief_id = rounds[-1]["messages"][-1]["id"]
    atc = last_message(rounds, "ATC", cand["id"]) or chief_id
    ground = last_message(rounds, "GROUND", cand["id"]) or chief_id
    pilot = last_message(rounds, "PILOT", cand["id"]) or chief_id
    how = mode_text(world, cand)
    return [
        {"claim": "Land %s" % cand["arrival"], "links": [atc, "CAP-01", "WAKE-01"]},
        {"claim": "Gate %s" % cand["gate"], "links": [ground, "GATE-01"]},
        {"claim": how[0].upper() + how[1:], "links": [pilot, "FUEL-01"]},
    ]


def save_log(log):
    LOG_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    path = LOG_DIR / ("run-%s-pool%d.json" % (stamp, log["scenario"]["pool_index"]))
    with open(path, "w") as f:
        json.dump(log, f, indent=2, ensure_ascii=False)
    return path


def no_safe_plan_log(log, world, candidates):
    # every candidate breaks a hard rule: no rounds, hand it to a human
    checks = []
    for c in candidates:
        block = first_block(world, c)
        # say which candidate it was. some details already start with the time
        if block["detail"].startswith(c["arrival"]):
            detail = "#%d %s" % (c["id"], block["detail"])
        else:
            detail = "#%d %s: %s" % (c["id"], c["arrival"], block["detail"])
        checks.append(dict(block, detail=detail))
    log["rounds"] = []
    log["rule_checks"] = checks
    log["decision"] = {
        "candidate": None,
        "summary": "No safe plan · hand to duty manager, consider diversion",
        "agreed_in_round": 0,
        "decided_by": "fallback",
        "status": "no_safe_plan",
        "trace": [],
    }
    return log


def run(pool_index, env, save=True):
    start = time.time()
    world = build_scenario(pool_index, env)
    candidates = build_candidates(world)

    log = {
        "environment": environment_block(world["env"]),
        "scenario": world["scenario"],
        "arrival_queue": world["arrival_queue"],
        "agents": AGENTS,
        "candidates": candidates,
        # not read by the UI, kept so every run can be audited later
        "eta": world["eta"],
        "sim": world["sim"],
    }
    tokens = 0
    ai_enabled = True
    fallback_calls = 0

    if not any(is_legal(world, c) for c in candidates):
        no_safe_plan_log(log, world, candidates)
        ai_enabled = False  # no agent was asked
    else:
        rounds = []
        blocked_checks = []
        next_id = 1
        proposal = None
        final = None
        decided_by = None
        agreed_in_round = None

        for round_no in range(1, MAX_ROUNDS + 1):
            answers, usage = ask_agents(world, candidates, round_no, proposal)
            tokens += usage["tokens"]
            ai_enabled = ai_enabled and usage["ai_enabled"]
            fallback_calls += usage["fallback_calls"]

            # ids are unique for the whole run: m1, m2, ...
            messages = []
            for a in answers:
                messages.append({"id": "m%d" % next_id, "agent": a["agent"], "action": a["action"],
                                 "candidate": a["candidate"], "text": a["text"]})
                next_id += 1
            blocked_checks += annotate_blocks(world, candidates, messages)

            chief = rule_on_round(world, candidates, messages, round_no, proposal)
            if chief["action"] == "decide":
                final = find(candidates, chief["candidate"])
                decided_by = "consensus"
                agreed_in_round = round_no
            elif round_no == MAX_ROUNDS:
                final = final_pick(world, candidates)
                decided_by = "chief_decided"
                agreed_in_round = round_no
                chief = {"agent": "CHIEF", "action": "decide", "candidate": final["id"],
                         "text": "No consensus after %d rounds. Chief picks #%d, lowest cost legal option" % (
                             MAX_ROUNDS, final["id"])}
            messages.append(dict({"id": "m%d" % next_id}, **chief))
            next_id += 1
            rounds.append({"round": round_no, "messages": messages})
            if final:
                break
            proposal = chief

        # the final plan's 4 checks go first: the trace page looks rules up by id
        final_checks = check_all(world, final)
        log["rounds"] = rounds
        log["rule_checks"] = final_checks + blocked_checks
        log["decision"] = {
            "candidate": final["id"],
            "arrival": final["arrival"],
            "gate": final["gate"],
            "mode": final["mode"],
            "summary": summary_for(world, final),
            "agreed_in_round": agreed_in_round,
            "decided_by": decided_by,
            "status": "pending_human",
            "trace": build_trace(world, rounds, final),
        }

    log["meta"] = {
        "model": MODEL,
        "elapsed_s": round(time.time() - start, 1),
        "tokens": tokens,
        "ai_enabled": ai_enabled,
        "fallback_calls": fallback_calls,
    }
    if save:
        log["meta"]["log_file"] = str(save_log(log).relative_to(ROOT))
    return log
