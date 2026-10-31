"""Three-round negotiation; the returned dict is the UI's sample_log contract."""
import json
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter

from src.scenario import build_scenario, default_env
from src.candidates import build_candidates
from src.rules import check_all, first_block
from src.chief import rule_on_round, final_pick

from src.agents import AGENTS, ask_agents

MAX_ROUNDS = 3
ROOT = Path(__file__).resolve().parents[1]
ENV_OPTIONS = {
    "weather": ["clear", "fog", "thunderstorm"],
    "runway": ["dual", "single", "one_closed"],
    "aircraft_status": ["normal", "low_fuel", "medical"],
    "terminal": ["normal", "tight", "zone_closed"],
    "ground_crew": ["normal", "shift_ending"],
    "passengers": ["few", "many_connecting"],
}


def normalize_environment(env):
    result = {**default_env(), **(env or {})}
    for key, value in result.items():
        if key not in ENV_OPTIONS or value not in ENV_OPTIONS[key]:
            raise ValueError("Invalid environment setting: %s=%s" % (key, value))
    return result


def no_safe_decision():
    return {"candidate": None, "arrival": None, "gate": None, "mode": None,
            "summary": "No safe plan · hand to duty manager, consider diversion",
            "status": "no_safe_plan", "decided_by": "fallback", "agreed_in_round": 0,
            "trace": []}


def build_decision(chosen, rounds, consensus):
    messages = [m for r in rounds for m in r["messages"]]
    chief_id = messages[-1]["id"]

    def evidence(agent):
        matching = [m["id"] for m in messages if m["agent"] == agent
                    and m["candidate"] == chosen["id"] and not m.get("blocked_by")]
        return matching[-1] if matching else chief_id

    mode = "Slow down instead of holding" if chosen["mode"] == "slow_down" else "Hold before landing"
    return {
        "candidate": chosen["id"], "arrival": chosen["arrival"], "gate": chosen["gate"],
        "mode": chosen["mode"],
        "summary": "Land %s · Gate %s · %s" % (chosen["arrival"], chosen["gate"], mode.lower()),
        "agreed_in_round": rounds[-1]["round"],
        "decided_by": "consensus" if consensus else "chief_decided",
        "status": "pending_human",
        "trace": [
            {"claim": "Land " + chosen["arrival"], "links": [evidence("ATC"), "CAP-01", "WAKE-01"]},
            {"claim": "Gate " + chosen["gate"], "links": [evidence("GROUND"), "GATE-01"]},
            {"claim": mode, "links": [evidence("PILOT"), "FUEL-01"]},
        ],
    }


def save_log(log):
    folder = ROOT / "logs"
    folder.mkdir(exist_ok=True)
    # Microseconds keep simultaneous API requests from overwriting each other.
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    path = folder / ("run-" + stamp + ".json")
    path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def run(pool_index: int, env: dict) -> dict:
    start = perf_counter()
    env = normalize_environment(env)
    world = build_scenario(pool_index, env)
    candidates = build_candidates(world)
    by_id = {c["id"]: c for c in candidates}
    log = {
        "environment": {k: {"value": v, "label": v, "options": ENV_OPTIONS[k]} for k, v in env.items()},
        "scenario": world["scenario"], "arrival_queue": world["arrival_queue"],
        "agents": AGENTS, "candidates": candidates, "rounds": [], "rule_checks": [],
        "decision": no_safe_decision(),
        "meta": {"model": "claude-haiku-5-5", "elapsed_s": 0, "tokens": 0, "ai_enabled": False},
    }
    legal = [c for c in candidates if first_block(world, c) is None]
    if not legal:
        log["rule_checks"] = [dict(first_block(world, c), candidate=c["id"]) for c in candidates]
    else:
        proposal = None
        consensus = False
        ai_enabled = True
        next_id = 1
        for round_no in range(1, MAX_ROUNDS + 1):
            messages, usage = ask_agents(world, candidates, round_no, proposal)
            log["meta"]["tokens"] += usage.get("tokens", 0)
            ai_enabled = ai_enabled and bool(usage.get("ai_enabled", False))
            # The agent module guarantees one validated answer per desk, in this order.
            messages = [dict(m) for m in messages]
            for m in messages:
                m["id"] = "m%d" % next_id
                next_id += 1
                m.pop("blocked_by", None)
                if m.get("candidate") not in by_id:
                    raise ValueError("Agent referenced an unknown candidate")
                block = first_block(world, by_id[m["candidate"]])
                if block:
                    m["blocked_by"] = block["id"]
                    log["rule_checks"].append(dict(block, message_id=m["id"]))
            chief = rule_on_round(world, candidates, messages, round_no, proposal)
            chief["id"] = "m%d" % next_id
            next_id += 1
            log["rounds"].append({"round": round_no, "messages": messages + [chief]})
            if chief["action"] == "decide":
                consensus = chief["candidate"] is not None
                break
            proposal = chief

        if consensus:
            chosen = by_id[chief["candidate"]]
        else:
            chosen = final_pick(world, candidates)
            chief.update(action="decide", candidate=chosen["id"] if chosen else None,
                         text=("No consensus after 3 rounds. Chief picks #%d, lowest cost legal option" % chosen["id"]
                               if chosen else "No safe plan. Hand to the duty manager."))
        if chosen:
            # Final checks first: the UI lookup(id) must show the chosen plan's pass,
            # even if an earlier proposal failed the same rule ID.
            log["rule_checks"] = check_all(world, chosen) + log["rule_checks"]
            log["decision"] = build_decision(chosen, log["rounds"], consensus)
        log["meta"]["ai_enabled"] = ai_enabled
    log["meta"]["elapsed_s"] = perf_counter() - start
    save_log(log)
    return log


if __name__ == "__main__":
    print(json.dumps(run(1, {"weather": "thunderstorm", "runway": "single"}), indent=2))
