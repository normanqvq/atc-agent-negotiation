"""
The rulebook. Four hard rules and one soft cost. Pure Python, no LLM anywhere.
"The AI can argue, but it can't break the rules."

check_all(world, cand)  -> 4 checks, fixed order WAKE-01, CAP-01, FUEL-01, GATE-01
first_block(world, cand) -> the first blocked check, or None
is_legal(world, cand)    -> bool
soft_cost(world, cand)   -> dict with delay / connections / overtime / fuel margin / total
"""
import json
import os
from src.timeutil import to_min, fmt, near

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "..", "data", "rules.json")) as f:
    RULES = {r["id"]: r for r in json.load(f)["rules"]}

# ---- numbers we assume (all simplifications, see data/rules.json) ----
WAKE_GAP = {"heavy": 3, "medium": 2, "light": 2}  # min behind that category
FOLLOW_GAP = 2                                      # min the next aircraft needs behind us (we are medium)
BURN = {"hold": 1.0, "slow_down": 0.4}              # fuel minutes burned per minute late
TAXI_IN = 5
GATE_STAY = 45
GATE_BUFFER = 10
# soft cost weights, assumed
W_CONNECTION = 2.0   # one missed connection ~ 2 min of delay
W_OVERTIME = 0.5     # one overtime minute ~ half a minute of delay


def _src(rule_id):
    # "FAA JO 7110.65, Chapter 5-5-4" -> "FAA JO 7110.65"
    return RULES[rule_id]["source"].split(",")[0]


def _check(rule_id, ok, detail):
    return {"id": rule_id, "name": RULES[rule_id]["name"], "status": "pass" if ok else "blocked",
            "detail": detail, "source": _src(rule_id)}


def _t(world, hhmm):
    # minutes on the same day as the ETA
    return near(to_min(hhmm), to_min(world["eta"]))


def check_wake(world, cand):
    arrival = _t(world, cand["arrival"])
    queue = [(f, _t(world, f["sched_arrival"])) for f in world["arrival_queue"]["flights"]]
    before = [(f, t) for f, t in queue if t <= arrival]
    after = [(f, t) for f, t in queue if t > arrival]
    if before:
        f, t = max(before, key=lambda x: x[1])
        cat = f.get("wake_category", "medium")
        need = WAKE_GAP.get(cat, 2)
        gap = arrival - t
        if gap < need:
            return _check("WAKE-01", False, "%s: preceding %s is %s, gap %d min < %d" % (cand["arrival"], f["flight"], cat.capitalize(), gap, need))
    if after:
        f, t = min(after, key=lambda x: x[1])
        gap = t - arrival
        if gap < FOLLOW_GAP:
            return _check("WAKE-01", False, "%s: following %s at %s, gap %d min < %d" % (cand["arrival"], f["flight"], f["sched_arrival"], gap, FOLLOW_GAP))
    if before:
        f, t = max(before, key=lambda x: x[1])
        return _check("WAKE-01", True, "%d min behind %s (%s), needs %d" % (arrival - t, f["flight"], f.get("wake_category", "medium"), WAKE_GAP.get(f.get("wake_category", "medium"), 2)))
    return _check("WAKE-01", True, "no traffic ahead of %s" % cand["arrival"])


def check_capacity(world, cand):
    arrival = _t(world, cand["arrival"])
    slot = arrival // 10
    count = sum(1 for f in world["arrival_queue"]["flights"] if _t(world, f["sched_arrival"]) // 10 == slot)
    limit = world["sim"]["acceptance_per_10min"]
    window = "%s–%s" % (fmt(slot * 10), fmt(slot * 10 + 10))
    weather = world["env"]["weather"]
    if count + 1 > limit:
        return _check("CAP-01", False, "%s already has %d arrivals, %s limit is %d" % (window, count, weather, limit))
    return _check("CAP-01", True, "%s: %d + us within the %s limit of %d" % (window, count, weather, limit))


def fuel_at_landing(world, cand):
    late = _t(world, cand["arrival"]) - to_min(world["eta"])
    return world["sim"]["fuel_endurance_min"] - late * BURN.get(cand["mode"], 1.0)


def check_fuel(world, cand):
    left = fuel_at_landing(world, cand)
    reserve = world["sim"]["min_reserve_min"]
    if left < reserve:
        return _check("FUEL-01", False, "lands with %d min of fuel, reserve is %d" % (left, reserve))
    return _check("FUEL-01", True, "lands with %d min of fuel, reserve is %d" % (left, reserve))


def check_gate(world, cand):
    sim = world["sim"]
    gate = cand["gate"]
    if gate in sim["closed_gates"]:
        return _check("GATE-01", False, "%s is closed" % gate)
    arrival = _t(world, cand["arrival"])
    start, end = arrival + TAXI_IN, arrival + TAXI_IN + GATE_STAY
    for s_str, e_str in sim["gates"].get(gate, []):
        s, e = _t(world, s_str), _t(world, e_str)
        if start < e + GATE_BUFFER and end > s - GATE_BUFFER:
            return _check("GATE-01", False, "%s occupied until %s" % (gate, e_str))
    return _check("GATE-01", True, "%s free %s–%s" % (gate, fmt(start), fmt(end)))


def check_all(world, cand):
    return [check_wake(world, cand), check_capacity(world, cand), check_fuel(world, cand), check_gate(world, cand)]


def first_block(world, cand):
    for c in check_all(world, cand):
        if c["status"] == "blocked":
            return c
    return None


def is_legal(world, cand):
    return first_block(world, cand) is None


def soft_cost(world, cand):
    sim = world["sim"]
    arrival = _t(world, cand["arrival"])
    sta = _t(world, world["scenario"]["scheduled_arrival"])
    delay = arrival - sta
    missed = sim["connecting_pax"] if arrival > _t(world, sim["connection_cutoff"]) else 0
    overtime = max(0, arrival + TAXI_IN + GATE_STAY - _t(world, sim["crew_shift_end"]))
    margin = fuel_at_landing(world, cand) - sim["min_reserve_min"]
    return {
        "delay_min": delay,
        "missed_connections": missed,
        "overtime_min": overtime,
        "fuel_margin_min": round(margin, 1),
        "total": round(delay + W_CONNECTION * missed + W_OVERTIME * overtime, 1),
    }


if __name__ == "__main__":
    from src.scenario import build_scenario
    from src.candidates import build_candidates
    for env in ({"weather": "clear", "runway": "dual"}, {"weather": "thunderstorm", "runway": "single"}):
        w = build_scenario(1, env)
        print("\n=== pool 1,", env, "ETA", w["eta"], "acceptance/10min", w["sim"]["acceptance_per_10min"])
        for c in build_candidates(w):
            checks = check_all(w, c)
            flag = "LEGAL  " if is_legal(w, c) else "BLOCKED"
            print(flag, "#%d %s %s %s cost=%s" % (c["id"], c["arrival"], c["gate"], c["mode"], soft_cost(w, c)["total"]))
            for k in checks:
                print("    %s %-7s %-16s %s" % ("✓" if k["status"] == "pass" else "✗", k["id"], k["name"], k["detail"]))
