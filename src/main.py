"""python -m src.main --pool 1 --weather thunderstorm --runway single"""
import argparse
from src.negotiation import run, ENV_OPTIONS
from src.scenario import default_env


def main():
    parser = argparse.ArgumentParser(description="Run one Concord negotiation")
    parser.add_argument("--pool", type=int, default=1)
    defaults = default_env()
    for key, options in ENV_OPTIONS.items():
        parser.add_argument("--" + key.replace("_", "-"), choices=options, default=defaults[key])
    args = vars(parser.parse_args())
    pool_index = args.pop("pool")
    try:
        log = run(pool_index, args)
    except ValueError as exc:
        parser.error(str(exc))
    for r in log["rounds"]:
        print("\nRound", r["round"])
        for m in r["messages"]:
            blocked = " [BLOCKED: %s]" % m["blocked_by"] if m.get("blocked_by") else ""
            print("%s %s #%s%s: %s" % (m["agent"], m["action"], m["candidate"], blocked, m["text"]))
    print("\n" + log["decision"]["summary"])
    print("Status: %s · %s" % (log["decision"]["status"], log["decision"]["decided_by"]))
    print("%.6fs · %d tokens · AI %s" % (log["meta"]["elapsed_s"], log["meta"]["tokens"], log["meta"]["ai_enabled"]))


if __name__ == "__main__":
    main()
