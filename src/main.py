"""
Run one negotiation from the command line and print who said what.

usage: python -m src.main --pool 1 --weather thunderstorm --runway single
"""
import argparse

from dotenv import load_dotenv

from src.negotiation import run

parser = argparse.ArgumentParser()
parser.add_argument("--pool", type=int, default=1)
parser.add_argument("--weather", default="clear")
parser.add_argument("--runway", default="dual")
parser.add_argument("--aircraft", default="normal", help="normal / low_fuel / medical")
parser.add_argument("--terminal", default="normal", help="normal / tight / zone_closed")
parser.add_argument("--crew", default="normal", help="normal / shift_ending")
parser.add_argument("--passengers", default="few", help="few / many_connecting")
args = parser.parse_args()

load_dotenv()

env = {
    "weather": args.weather, "runway": args.runway, "aircraft_status": args.aircraft,
    "terminal": args.terminal, "ground_crew": args.crew, "passengers": args.passengers,
}
log = run(args.pool, env)

s = log["scenario"]
print("%s %s->%s, scheduled %s, %d min late (ETA %s)" % (
    s["flight"], s["origin"], s["destination"], s["scheduled_arrival"], s["delay_min"], log["eta"]))
for c in log["candidates"]:
    print("  #%d %s gate %s %s" % (c["id"], c["arrival"], c["gate"], c["mode"]))

for r in log["rounds"]:
    print("\nround", r["round"])
    for m in r["messages"]:
        blocked = "  << BLOCKED by %s" % m["blocked_by"] if m.get("blocked_by") else ""
        print("  %-6s %-7s #%s  %s%s" % (m["agent"], m["action"], m["candidate"], m["text"], blocked))

d = log["decision"]
print("\n%s  [%s, %s]" % (d["summary"], d["status"], d["decided_by"]))
for t in d["trace"]:
    print("  %s <- %s" % (t["claim"], ", ".join(t["links"])))
meta = log["meta"]
print("\n%.1fs, %d tokens, ai_enabled=%s, saved to %s" % (
    meta["elapsed_s"], meta["tokens"], meta["ai_enabled"], meta.get("log_file")))
