"""
Build the "world" for one negotiation: one real flight from data/pool.json
plus the simulated stuff (gates, fuel, crew, connections) that the judge's
environment choices decide.

Everything is a plain dict. Times are "HH:MM" strings, same as the UI.

usage: python -m src.scenario
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POOL_PATH = ROOT / "data" / "pool.json"

# the 6 dimensions the judge can set, and their allowed values.
# first value = default. labels copied from ui/src/lib/scenario.js (DIMENSIONS)
DIMENSIONS = {
    "weather": [("clear", "Clear"), ("fog", "Fog"), ("thunderstorm", "Thunderstorm")],
    "runway": [("dual", "Dual"), ("single", "Single"), ("one_closed", "One closed")],
    "aircraft_status": [("normal", "Normal"), ("low_fuel", "Low fuel"), ("medical", "Medical emergency")],
    "terminal": [("normal", "Normal"), ("tight", "Gates tight"), ("zone_closed", "Zone closed")],
    "ground_crew": [("normal", "Normal"), ("shift_ending", "Shift ending")],
    "passengers": [("few", "Few connecting"), ("many_connecting", "Many connecting")],
}

# CAP-01 numbers. weather factor is also written in data/rules.json
WEATHER_FACTOR = {"clear": 1.0, "fog": 0.6, "thunderstorm": 0.5}
RUNWAY_BASE_PER_10MIN = {"dual": 4, "single": 2, "one_closed": 1}

# FUEL-01: minutes of endurance left when we reach the ETA
FUEL_ENDURANCE = {"normal": 70, "low_fuel": 35, "medical": 70}
MIN_RESERVE_MIN = 30

# fixed simulated values
FLIGHT_CREW_DUTY_LEFT_MIN = 140
NEXT_LEG_AFTER_ETA = 75
ORIGINAL_GATE = "B12"
SUBJECT_WAKE = "medium"

# CONN-01: passengers miss their connection if we land later than ETA + this.
# note: issue #2 said ETA+35, but every candidate lands by ETA+30, so nobody
# could ever miss a connection and CONN-01 would never matter. ETA+15 is a
# (simulated) tight connection bank, so the later candidates actually cost something.
CONNECTION_CUTOFF_AFTER_ETA = 15


def to_min(hhmm):
    # "17:52" -> 1072 minutes since midnight
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def fmt(minutes):
    # 1072 -> "17:52". wraps past midnight
    minutes = int(round(minutes)) % (24 * 60)
    return "%02d:%02d" % (minutes // 60, minutes % 60)


def near(hhmm, ref_min):
    # minutes of hhmm, moved by +-24h so it is within 12h of ref_min.
    # this way 00:10 counts as "after" 23:50 when the ETA is close to midnight
    m = to_min(hhmm)
    while m - ref_min > 12 * 60:
        m -= 24 * 60
    while m - ref_min < -12 * 60:
        m += 24 * 60
    return m


def load_pool():
    with open(POOL_PATH) as f:
        return json.load(f)["flights"]


def clean_env(env):
    # fill missing dimensions with the default, reject values we don't know
    env = env or {}
    out = {}
    for key, options in DIMENSIONS.items():
        allowed = [value for value, _ in options]
        value = env.get(key, allowed[0])
        if value not in allowed:
            raise ValueError("%s must be one of %s, got %r" % (key, allowed, value))
        out[key] = value
    return out


def build_sim(env, eta):
    # all the simulated (SIM) numbers, decided by the environment. eta in minutes
    rate = RUNWAY_BASE_PER_10MIN[env["runway"]] * WEATHER_FACTOR[env["weather"]]
    acceptance = max(1, math.floor(rate))

    # gate occupancy: [start, end] of whoever is parked there now
    if env["terminal"] == "tight":
        gates = {
            "B12": [[fmt(eta - 30), fmt(eta + 60)]],
            "B14": [[fmt(eta - 30), fmt(eta + 15)]],
            "C3": [],
        }
    else:
        gates = {
            "B12": [[fmt(eta - 30), fmt(eta + 20)]],
            "B14": [],
            "C3": [],
        }
    closed = ["B12", "B14"] if env["terminal"] == "zone_closed" else []

    if env["ground_crew"] == "shift_ending":
        shift_end = eta + 25
    else:
        shift_end = eta + 120

    return {
        "acceptance_per_10min": acceptance,
        "fuel_endurance_min": FUEL_ENDURANCE[env["aircraft_status"]],
        "min_reserve_min": MIN_RESERVE_MIN,
        "connecting_pax": 32 if env["passengers"] == "many_connecting" else 6,
        "connection_cutoff": fmt(eta + CONNECTION_CUTOFF_AFTER_ETA),
        "crew_shift_end": fmt(shift_end),
        "flight_crew_duty_left_min": FLIGHT_CREW_DUTY_LEFT_MIN,
        "next_leg_departure": fmt(eta + NEXT_LEG_AFTER_ETA),
        "original_gate": ORIGINAL_GATE,
        "gates": gates,
        "closed_gates": closed,
    }


def build_scenario(pool_index, env):
    # pool_index matches data/pool.json flights[].pool_index
    env = clean_env(env)
    flight = None
    for f in load_pool():
        if f["pool_index"] == pool_index:
            flight = f
    if flight is None:
        raise ValueError("no flight with pool_index %r in data/pool.json" % pool_index)

    # copy the real fields the UI reads (contract: data/sample_log.json "scenario")
    scenario = {}
    for key in ["pool_index", "row_id", "date", "flight", "airline", "origin", "destination",
                "scheduled_arrival", "delay_min", "delay_breakdown"]:
        scenario[key] = flight[key]
    scenario["real_fields"] = ["flight", "airline", "origin", "destination", "scheduled_arrival",
                               "delay_min", "delay_breakdown", "arrival_queue"]
    scenario["simulated_fields"] = ["gate", "fuel", "crew", "connections", "wake_category"]

    eta = to_min(flight["scheduled_arrival"]) + flight["delay_min"]
    # leave our own flight out of the queue, the rules compare us against the others
    queue = [dict(q) for q in flight["arrival_queue"] if not q.get("is_subject")]

    return {
        "pool_index": pool_index,
        "scenario": scenario,
        "eta": fmt(eta),
        "arrival_queue": {"flights": queue},
        "env": env,
        "subject_wake": SUBJECT_WAKE,
        "sim": build_sim(env, eta),
    }


if __name__ == "__main__":
    world = build_scenario(1, {"weather": "thunderstorm", "runway": "single"})
    print(json.dumps(world, indent=2))
