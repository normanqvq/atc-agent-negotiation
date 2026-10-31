"""
build_candidates(world) -> 5 candidate plans, id 1..5, sorted by time.

Candidates are NOT filtered here. An agent may propose an illegal one and the
rule layer blocks it; that is the "Blocked" beat of the demo.
"""
import json
from src.timeutil import to_min, fmt, near

OFFSETS = [0, 6, 12, 20, 30]      # minutes after ETA
SLOW_DOWN_MAX = 15                # later than this = holding in the air
TAXI_IN = 5                       # minutes from touchdown to gate
GATE_STAY = 45                    # minutes at the gate
GATE_BUFFER = 10                  # minutes between two aircraft at one gate


def gate_is_free(world, gate, arrival):
    """same test GATE-01 uses: closed gate or overlapping occupancy = not free"""
    sim = world["sim"]
    if gate in sim["closed_gates"]:
        return False
    eta = to_min(world["eta"])
    start, end = arrival + TAXI_IN, arrival + TAXI_IN + GATE_STAY
    for s, e in sim["gates"].get(gate, []):
        s, e = near(to_min(s), eta), near(to_min(e), eta)
        if start < e + GATE_BUFFER and end > s - GATE_BUFFER:
            return False
    return True


def build_candidates(world):
    eta = to_min(world["eta"])
    sim = world["sim"]
    out = []
    for i, off in enumerate(OFFSETS, start=1):
        arrival = eta + off
        mode = "slow_down" if off <= SLOW_DOWN_MAX else "hold"

        # original gate if it works, else the first free one, else B12 and let GATE-01 block it
        gate = sim["original_gate"]
        if not gate_is_free(world, gate, arrival):
            free = [g for g in sim["gates"] if g != gate and gate_is_free(world, g, arrival)]
            gate = free[0] if free else sim["original_gate"]

        if i == 1:
            note = "earliest slot"
        elif gate == "C3":
            note = "remote gate"
        elif mode == "slow_down" and off > 0:
            note = "slow down %d min instead of holding" % off
        else:
            note = ""

        out.append({"id": i, "arrival": fmt(arrival), "gate": gate, "mode": mode, "note": note})
    return out


if __name__ == "__main__":
    from src.scenario import build_scenario
    w = build_scenario(1, {"weather": "thunderstorm", "runway": "single"})
    print("ETA", w["eta"], "gates", w["sim"]["gates"], "closed", w["sim"]["closed_gates"])
    for c in build_candidates(w):
        print(json.dumps(c))
