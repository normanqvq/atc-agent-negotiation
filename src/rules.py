"""
The rulebook: 4 hard rules + 1 soft cost. Plain Python, no LLM anywhere.
"The AI can argue, but it can't break the rules."

check_all(world, cand)   -> 4 checks, always in the order WAKE-01, CAP-01, FUEL-01, GATE-01
first_block(world, cand) -> first blocked check, or None
is_legal(world, cand)    -> True if all 4 pass
soft_cost(world, cand)   -> delay / missed connections / overtime / fuel margin / total

Deterministic on purpose: the evaluation injects bad proposals and expects
every single one to be blocked.

usage: python -m src.rules
"""
import json

from src.scenario import ROOT, to_min, fmt, near

RULES_PATH = ROOT / "data" / "rules.json"

# WAKE-01: minutes we must stay behind the aircraft in front of us, by its wake category.
# (data/rules.json simplification: time gaps instead of NM)
WAKE_GAP_BEHIND = {"heavy": 3, "medium": 2, "light": 2}
# and the aircraft behind us needs this much gap behind us (we are medium)
WAKE_GAP_AHEAD = 2

# FUEL-01: minutes of endurance burned per minute of delay
BURN_RATE = {"hold": 1.0, "slow_down": 0.4, "divert": 1.0}

# GATE-01: we use the gate from arrival+TAXI to arrival+TAXI+TURNAROUND, with a buffer
TAXI_MIN = 5
TURNAROUND_MIN = 45
GATE_BUFFER_MIN = 10

# soft cost weights. these are assumptions, not data:
# one missed connection "costs" like 2 min of delay, one minute of ramp overtime like 0.5 min
WEIGHT_MISSED_CONNECTION = 2.0
WEIGHT_OVERTIME = 0.5


def load_rule_table():
    # id -> {name, source} from data/rules.json. source is cut to its first part
    with open(RULES_PATH) as f:
        rules = json.load(f)["rules"]
    table = {}
    for r in rules:
        source = r["source"].split("(")[0].split(",")[0].strip()
        table[r["id"]] = {"name": r["name"], "source": source}
    return table


RULE_TABLE = load_rule_table()


def make_check(rule_id, blocked, detail):
    return {
        "id": rule_id,
        "name": RULE_TABLE[rule_id]["name"],
        "status": "blocked" if blocked else "pass",
        "detail": detail,
        "source": RULE_TABLE[rule_id]["source"],
    }


def eta_min(world):
    return to_min(world["eta"])


def t(world, hhmm):
    # "HH:MM" -> minutes, on the same day as the ETA (handles midnight)
    return near(hhmm, eta_min(world))


def queue_times(world):
    # [(minutes, flight dict)] for the other arrivals, sorted by time
    out = []
    for f in world["arrival_queue"]["flights"]:
        if f.get("is_subject"):
            continue
        out.append((t(world, f["sched_arrival"]), f))
    out.sort(key=lambda x: x[0])
    return out


# ---------- WAKE-01 ----------

def check_wake(world, cand):
    arr = t(world, cand["arrival"])
    before = None  # closest arrival at or before us
    after = None   # closest arrival after us
    for m, f in queue_times(world):
        if m <= arr:
            before = (m, f)
        elif after is None:
            after = (m, f)

    if before:
        m, f = before
        need = WAKE_GAP_BEHIND.get(f["wake_category"], 2)
        gap = arr - m
        if gap < need:
            return make_check("WAKE-01", True, "%s: preceding %s is %s, gap %d min < %d" % (
                cand["arrival"], f["flight"], f["wake_category"].capitalize(), gap, need))
    if after:
        m, f = after
        gap = m - arr
        if gap < WAKE_GAP_AHEAD:
            return make_check("WAKE-01", True, "%s: %s follows only %d min behind us, needs %d" % (
                cand["arrival"], f["flight"], gap, WAKE_GAP_AHEAD))

    parts = []
    if before:
        parts.append("%d min behind %s (%s)" % (arr - before[0], before[1]["flight"], before[1]["wake_category"]))
    if after:
        parts.append("%d min ahead of %s" % (after[0] - arr, after[1]["flight"]))
    detail = "%s: %s" % (cand["arrival"], ", ".join(parts)) if parts else "%s: no neighbours in the queue" % cand["arrival"]
    return make_check("WAKE-01", False, detail)


# ---------- CAP-01 ----------

def check_capacity(world, cand):
    arr = t(world, cand["arrival"])
    slot = arr // 10
    already = 0
    for m, f in queue_times(world):
        if m // 10 == slot:
            already += 1
    limit = world["sim"]["acceptance_per_10min"]
    window = "%s-%s" % (fmt(slot * 10), fmt(slot * 10 + 10))
    weather = world["env"]["weather"]
    runway = world["env"]["runway"].replace("_", " ")
    if already + 1 > limit:
        return make_check("CAP-01", True, "%s already has %d arrival%s, %s + %s runway limit is %d" % (
            window, already, "" if already == 1 else "s", weather, runway, limit))
    return make_check("CAP-01", False, "%s has %d other arrival%s, limit is %d" % (
        window, already, "" if already == 1 else "s", limit))


# ---------- FUEL-01 ----------

def fuel_at_landing(world, cand):
    late = t(world, cand["arrival"]) - eta_min(world)
    burn = BURN_RATE.get(cand["mode"], 1.0)
    return world["sim"]["fuel_endurance_min"] - late * burn


def check_fuel(world, cand):
    fuel = fuel_at_landing(world, cand)
    reserve = world["sim"]["min_reserve_min"]
    if fuel < reserve:
        return make_check("FUEL-01", True, "lands with %.0f min of fuel, reserve is %d" % (fuel, reserve))
    return make_check("FUEL-01", False, "lands with %.0f min of fuel, reserve is %d" % (fuel, reserve))


# ---------- GATE-01 ----------

def gate_conflict(world, gate, arrival):
    # returns None if the gate is free for an aircraft landing at "HH:MM", else the reason
    if gate in world["sim"]["closed_gates"]:
        return "%s is closed" % gate
    arr = t(world, arrival)
    start = arr + TAXI_MIN
    end = arr + TAXI_MIN + TURNAROUND_MIN
    for busy_from, busy_to in world["sim"]["gates"].get(gate, []):
        b0 = t(world, busy_from) - GATE_BUFFER_MIN
        b1 = t(world, busy_to) + GATE_BUFFER_MIN
        if start < b1 and end > b0:
            return "%s occupied until %s" % (gate, busy_to)
    return None


def check_gate(world, cand):
    reason = gate_conflict(world, cand["gate"], cand["arrival"])
    if reason:
        return make_check("GATE-01", True, reason)
    arr = t(world, cand["arrival"])
    return make_check("GATE-01", False, "%s free %s to %s" % (
        cand["gate"], fmt(arr + TAXI_MIN), fmt(arr + TAXI_MIN + TURNAROUND_MIN)))


# ---------- the API the rest of the code uses ----------

def check_all(world, cand):
    return [
        check_wake(world, cand),
        check_capacity(world, cand),
        check_fuel(world, cand),
        check_gate(world, cand),
    ]


def first_block(world, cand):
    for check in check_all(world, cand):
        if check["status"] == "blocked":
            return check
    return None


def is_legal(world, cand):
    return first_block(world, cand) is None


def soft_cost(world, cand):
    sim = world["sim"]
    arr = t(world, cand["arrival"])
    delay = arr - t(world, world["scenario"]["scheduled_arrival"])
    # CONN-01 is soft: costs something, never vetoes
    missed = sim["connecting_pax"] if arr > t(world, sim["connection_cutoff"]) else 0
    overtime = max(0, arr + TAXI_MIN + TURNAROUND_MIN - t(world, sim["crew_shift_end"]))
    fuel_margin = fuel_at_landing(world, cand) - sim["min_reserve_min"]
    total = delay + WEIGHT_MISSED_CONNECTION * missed + WEIGHT_OVERTIME * overtime
    return {
        "delay_min": delay,
        "missed_connections": missed,
        "overtime_min": overtime,
        "fuel_margin_min": round(fuel_margin, 1),
        "total": round(total, 1),
    }


if __name__ == "__main__":
    from src.scenario import build_scenario
    from src.candidates import build_candidates

    for env in [{"weather": "clear", "runway": "dual"}, {"weather": "thunderstorm", "runway": "single"}]:
        world = build_scenario(1, env)
        print("=== pool 1,", env, "ETA", world["eta"], "acceptance", world["sim"]["acceptance_per_10min"])
        for cand in build_candidates(world):
            print("#%d %s %s %s" % (cand["id"], cand["arrival"], cand["gate"], cand["mode"]))
            for check in check_all(world, cand):
                print("   %-7s %-7s %s" % (check["id"], check["status"], check["detail"]))
            print("   cost", soft_cost(world, cand))
