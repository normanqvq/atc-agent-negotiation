"""
build_scenario(pool_index, env) -> world

world = the one real flight (from data/pool.json) plus the simulated bits the
environment conditions decide (gates, fuel, crew, connections). Issue #2 has
the table this follows. Everything simulated lives under world["sim"].
"""
import json
import os
from src.timeutil import to_min, fmt

HERE = os.path.dirname(os.path.abspath(__file__))
POOL_PATH = os.path.join(HERE, "..", "data", "pool.json")

# condition -> number. all assumptions, see data/rules.json CAP-01 for the weather factor
WEATHER_FACTOR = {"clear": 1.0, "fog": 0.6, "thunderstorm": 0.5}
RUNWAY_BASE = {"dual": 4, "single": 2, "one_closed": 1}      # arrivals per 10 min
FUEL_ENDURANCE = {"normal": 70, "low_fuel": 35, "medical": 70}  # min of flying left at ETA
MIN_RESERVE = 30
CREW_DUTY_LEFT = 140
GATES = ["B12", "B14", "C3"]
ORIGINAL_GATE = "B12"

REAL_FIELDS = ["flight", "airline", "origin", "destination", "scheduled_arrival",
               "delay_min", "delay_breakdown", "arrival_queue"]
SIM_FIELDS = ["gate", "fuel", "crew", "connections", "wake_category"]


def load_pool():
    with open(POOL_PATH) as f:
        return json.load(f)["flights"]


def default_env():
    return {"weather": "clear", "runway": "dual", "aircraft_status": "normal",
            "terminal": "normal", "ground_crew": "normal", "passengers": "few"}


def build_scenario(pool_index, env):
    env = {**default_env(), **(env or {})}
    pool = load_pool()
    row = next((f for f in pool if f["pool_index"] == pool_index), None)
    if row is None:
        raise ValueError("pool_index %s not in data/pool.json" % pool_index)

    eta = to_min(row["scheduled_arrival"]) + row["delay_min"]   # minutes, may pass 24:00

    # gates: which slots are already taken, per terminal condition
    closed = []
    if env["terminal"] == "normal":
        gates = {"B12": [[fmt(eta - 40), fmt(eta + 20)]], "B14": [], "C3": []}
    elif env["terminal"] == "tight":
        gates = {"B12": [[fmt(eta - 40), fmt(eta + 60)]], "B14": [[fmt(eta - 30), fmt(eta + 15)]], "C3": []}
    else:  # zone_closed, only the remote gate is left
        gates = {"B12": [], "B14": [], "C3": []}
        closed = ["B12", "B14"]

    base = RUNWAY_BASE.get(env["runway"], 4)
    factor = WEATHER_FACTOR.get(env["weather"], 1.0)

    sim = {
        "acceptance_per_10min": max(1, int(base * factor)),
        "fuel_endurance_min": FUEL_ENDURANCE.get(env["aircraft_status"], 70),
        "min_reserve_min": MIN_RESERVE,
        "connecting_pax": 32 if env["passengers"] == "many_connecting" else 6,
        # deviation from the issue #2 table (ETA+35 for both): with candidates only up to
        # ETA+30 nobody ever missed a connection, so Pilot had nothing to argue for.
        # many_connecting now has a tight bank: candidates later than ETA+15 miss it.
        "connection_cutoff": fmt(eta + (15 if env["passengers"] == "many_connecting" else 35)),
        "crew_shift_end": fmt(eta + (25 if env["ground_crew"] == "shift_ending" else 120)),
        "flight_crew_duty_left_min": CREW_DUTY_LEFT,
        "next_leg_departure": fmt(eta + 75),
        "original_gate": ORIGINAL_GATE,
        "gates": gates,
        "closed_gates": closed,
    }

    scenario = {k: v for k, v in row.items() if k != "arrival_queue"}
    scenario["real_fields"] = REAL_FIELDS
    scenario["simulated_fields"] = SIM_FIELDS

    return {
        "pool_index": pool_index,
        "scenario": scenario,
        "eta": fmt(eta),
        "arrival_queue": {"flights": row["arrival_queue"]},
        "env": env,
        "sim": sim,
        "subject_wake": "medium",
    }


if __name__ == "__main__":
    w = build_scenario(1, {"weather": "thunderstorm", "runway": "single"})
    print(json.dumps(w, indent=2))
