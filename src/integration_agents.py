"""Temporary rule-only adapter for issue #4 while src/agents.py (#3) is absent.

Remove this file once #3 lands. Each desk uses only its own constraints. This
is deliberately not an AI implementation; usage always reports ai_enabled=False.
"""
import json
from pathlib import Path
from src.rules import check_wake, check_capacity, check_fuel, check_gate

AGENTS = json.loads((Path(__file__).resolve().parents[1] / "data/sample_log.json").read_text())["agents"]


def ask_agents(world, candidates, round_no, chief_proposal):
    tests = {
        "ATC": lambda c: check_wake(world, c)["status"] == "pass" and check_capacity(world, c)["status"] == "pass",
        "PILOT": lambda c: check_fuel(world, c)["status"] == "pass",
        "GROUND": lambda c: check_gate(world, c)["status"] == "pass",
    }
    messages = []
    for agent, accepts in tests.items():
        own = next((c for c in candidates if accepts(c)), candidates[0])
        proposed = next((c for c in candidates if chief_proposal and c["id"] == chief_proposal["candidate"]), None)
        if proposed and accepts(proposed):
            chosen, action = proposed, "accept"
        else:
            chosen = own
            action = ("rank" if agent == "ATC" else "propose") if round_no == 1 else "counter"
        reasons = {"ATC": "preserve wake separation and runway capacity",
                   "PILOT": "protect landing fuel reserve and land early",
                   "GROUND": "use an available gate"}
        messages.append({"agent": agent, "action": action, "candidate": chosen["id"],
                         "text": "%s #%d to %s" % (action.capitalize(), chosen["id"], reasons[agent])})
    return messages, {"tokens": 0, "ai_enabled": False}
