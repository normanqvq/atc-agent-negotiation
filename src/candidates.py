"""
Build the 5 candidate landing plans the agents can choose from.

Agents may only refer to these by id (#1..#5), they can't invent times or gates.
We do NOT filter out illegal ones here: an agent may still propose one,
and then the rule layer blocks it in front of everyone. That's the demo.

usage: python -m src.candidates
"""
from src.scenario import to_min, fmt
from src.rules import gate_conflict

# minutes after the ETA for each candidate
OFFSETS = [0, 6, 12, 20, 30]
# up to this much extra delay can be absorbed by slowing down en route, more means holding
SLOW_DOWN_MAX = 15
# gate preference: original gate first, then the others
GATE_ORDER = ["B12", "B14", "C3"]
REMOTE_GATES = ["C3"]


def pick_gate(world, arrival):
    original = world["sim"]["original_gate"]
    order = [original] + [g for g in GATE_ORDER if g != original]
    for gate in order:
        if gate_conflict(world, gate, arrival) is None:
            return gate
    # nothing free: still give the original gate and let GATE-01 block it
    return original


def make_note(offset, mode, gate, first):
    parts = []
    if first:
        parts.append("earliest slot")
    if mode == "slow_down" and offset > 0:
        parts.append("slow down %d min instead of holding" % offset)
    if mode == "hold":
        parts.append("hold %d min" % offset)
    if gate in REMOTE_GATES:
        parts.append("remote gate")
    return ", ".join(parts)


def build_candidates(world):
    eta = to_min(world["eta"])
    cands = []
    for i, offset in enumerate(OFFSETS):
        arrival = fmt(eta + offset)
        mode = "slow_down" if offset <= SLOW_DOWN_MAX else "hold"
        gate = pick_gate(world, arrival)
        cands.append({
            "id": i + 1,
            "arrival": arrival,
            "gate": gate,
            "mode": mode,
            "note": make_note(offset, mode, gate, i == 0),
        })
    return cands


if __name__ == "__main__":
    from src.scenario import build_scenario

    world = build_scenario(1, {"weather": "thunderstorm", "runway": "single"})
    print("ETA", world["eta"])
    for c in build_candidates(world):
        print(c)
