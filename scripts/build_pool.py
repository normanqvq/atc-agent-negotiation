"""
Build data/pool.json: the real flights the judge can pick from.

Reads flights.csv (2015 US DOT on-time data), keeps ATL arrivals that match the
problem statement (WEATHER_DELAY > 15 or LATE_AIRCRAFT_DELAY > 20), samples 20
with a fixed seed, and attaches the real arrival queue at ATL around each one.

wake_category is NOT in the data. It is simulated from the tail number so it is
stable between runs. The UI tags it SIM.

usage: python scripts/build_pool.py [path/to/flights.csv] [--n 20] [--airport ATL]
"""
import sys, json, argparse, hashlib
import pandas as pd

parser = argparse.ArgumentParser()
parser.add_argument("csv", nargs="?", default="data/flights.csv")
parser.add_argument("--n", type=int, default=20)
parser.add_argument("--airport", default="ATL")
parser.add_argument("--seed", type=int, default=42)
parser.add_argument("--out", default="data/pool.json")
args = parser.parse_args()

cols = ["YEAR", "MONTH", "DAY", "AIRLINE", "FLIGHT_NUMBER", "TAIL_NUMBER",
        "ORIGIN_AIRPORT", "DESTINATION_AIRPORT", "SCHEDULED_ARRIVAL", "ARRIVAL_DELAY",
        "CANCELLED", "DIVERTED", "AIR_SYSTEM_DELAY", "SECURITY_DELAY", "AIRLINE_DELAY",
        "LATE_AIRCRAFT_DELAY", "WEATHER_DELAY"]
print("reading", args.csv, "...")
df = pd.read_csv(args.csv, usecols=cols, dtype={"ORIGIN_AIRPORT": str, "DESTINATION_AIRPORT": str, "TAIL_NUMBER": str})
df["row_id"] = df.index  # original row number, so we can cite it

# only arrivals at our airport that actually landed
arr = df[(df.DESTINATION_AIRPORT == args.airport) & (df.CANCELLED == 0) & (df.DIVERTED == 0)].copy()
print("arrivals at", args.airport, ":", len(arr))

def hhmm(v):
    # SCHEDULED_ARRIVAL is an int like 1705 -> "17:05"
    v = int(v)
    return "%02d:%02d" % (v // 100, v % 100)

def to_min(v):
    v = int(v)
    return (v // 100) * 60 + v % 100

airlines = pd.read_csv("data/airlines.csv").set_index("IATA_CODE")["AIRLINE"].to_dict()

def wake(tail):
    # simulated: ~20% heavy, stable per tail number
    h = int(hashlib.md5(str(tail).encode()).hexdigest(), 16)
    return "heavy" if h % 5 == 0 else "medium"

# candidate disruptions, per the problem statement, kept in a demo-able range
cand = arr[((arr.WEATHER_DELAY > 15) | (arr.LATE_AIRCRAFT_DELAY > 20))
           & (arr.ARRIVAL_DELAY >= 20) & (arr.ARRIVAL_DELAY <= 120)
           & (arr.SCHEDULED_ARRIVAL >= 700) & (arr.SCHEDULED_ARRIVAL <= 2200)]
print("matching disruptions:", len(cand))
picked = cand.sample(n=min(args.n, len(cand)), random_state=args.seed).sort_values(["MONTH", "DAY", "SCHEDULED_ARRIVAL"])

flights = []
for i, (_, r) in enumerate(picked.iterrows(), start=1):
    sta = to_min(r.SCHEDULED_ARRIVAL)
    same_day = arr[(arr.MONTH == r.MONTH) & (arr.DAY == r.DAY) & (arr.row_id != r.row_id)]
    mins = same_day.SCHEDULED_ARRIVAL.map(to_min)
    q = same_day[(mins >= sta - 30) & (mins <= sta + 60)].sort_values("SCHEDULED_ARRIVAL").head(8)
    queue = [{
        "flight": f"{qr.AIRLINE}{int(qr.FLIGHT_NUMBER):04d}",
        "sched_arrival": hhmm(qr.SCHEDULED_ARRIVAL),
        "wake_category": wake(qr.TAIL_NUMBER),
        "real": True,
    } for _, qr in q.iterrows()]

    def d(x):
        return 0 if pd.isna(x) else int(x)

    flights.append({
        "pool_index": i,
        "row_id": int(r.row_id),
        "date": f"2015-{int(r.MONTH):02d}-{int(r.DAY):02d}",
        "flight": f"{r.AIRLINE}{int(r.FLIGHT_NUMBER):04d}",
        "airline": airlines.get(r.AIRLINE, r.AIRLINE),
        "tail_number": str(r.TAIL_NUMBER),
        "origin": r.ORIGIN_AIRPORT,
        "destination": r.DESTINATION_AIRPORT,
        "scheduled_arrival": hhmm(r.SCHEDULED_ARRIVAL),
        "delay_min": int(r.ARRIVAL_DELAY),
        "delay_breakdown": {
            "weather": d(r.WEATHER_DELAY),
            "late_aircraft": d(r.LATE_AIRCRAFT_DELAY),
            "nas": d(r.AIR_SYSTEM_DELAY),
            "carrier": d(r.AIRLINE_DELAY),
            "security": d(r.SECURITY_DELAY),
        },
        "arrival_queue": queue,
    })

out = {
    "_note": f"Real {args.airport} arrivals from flights.csv matching WEATHER_DELAY>15 or LATE_AIRCRAFT_DELAY>20, seed {args.seed}. wake_category is simulated from the tail number.",
    "airport": args.airport,
    "flights": flights,
}
json.dump(out, open(args.out, "w"), indent=2)
print("wrote", args.out, "with", len(flights), "flights")
