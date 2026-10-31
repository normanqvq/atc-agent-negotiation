"""
The Chief: plain code, not an LLM. Reads one round of answers (already
marked with blocked_by by the rule layer) and either declares consensus or
proposes a compromise for the next round.

Weights are fixed: ATC counts most, then Pilot, then Ground.
"""
from src.rules import is_legal, soft_cost

WEIGHTS = {"ATC": 3, "PILOT": 2, "GROUND": 1}


def find(candidates, cand_id):
    for c in candidates:
        if c["id"] == cand_id:
            return c
    return None


def cost(world, candidates, cand_id):
    return soft_cost(world, find(candidates, cand_id))["total"]


def agreed_candidate(messages, round_no, current_proposal):
    # round 1: nobody was blocked and all three desks picked the same candidate.
    # round 2+: all three accepted the Chief's proposal (three counters to the same
    # other candidate is not consensus, the Chief proposes again)
    desks = [m for m in messages if m["agent"] != "CHIEF"]
    if any(m.get("blocked_by") for m in desks):
        return None
    if round_no == 1:
        picks = set(m["candidate"] for m in desks)
        return picks.pop() if len(picks) == 1 else None
    if all(m["action"] == "accept" and m["candidate"] == current_proposal["candidate"] for m in desks):
        return current_proposal["candidate"]
    return None


def compromise(world, candidates, messages):
    # score every legal candidate that an unblocked desk asked for
    scores = {}
    for m in messages:
        if m["agent"] == "CHIEF" or m.get("blocked_by"):
            continue
        if not is_legal(world, find(candidates, m["candidate"])):
            continue
        scores[m["candidate"]] = scores.get(m["candidate"], 0) + WEIGHTS[m["agent"]]
    if scores:
        # highest score wins, ties go to the cheaper one
        return max(scores, key=lambda cid: (scores[cid], -cost(world, candidates, cid)))
    best = final_pick(world, candidates)
    return best["id"] if best else None


def rule_on_round(world, candidates, messages, round_no, current_proposal):
    agreed = agreed_candidate(messages, round_no, current_proposal)
    if agreed is not None:
        if round_no == 1:
            text = "All three desks pick #%d. Consensus in round 1" % agreed
        else:
            text = "All three accept #%d. Consensus in round %d" % (agreed, round_no)
        return {"agent": "CHIEF", "action": "decide", "candidate": agreed, "text": text}

    pick = compromise(world, candidates, messages)
    blocked = ["#%d blocked by %s" % (m["candidate"], m["blocked_by"]) for m in messages if m.get("blocked_by")]
    # same candidate blocked twice only needs saying once
    blocked = list(dict.fromkeys(blocked))
    if blocked:
        text = "%s. Compromise: #%d. Please confirm" % (", ".join(blocked), pick)
    else:
        text = "Desks disagree. Compromise: #%d. Please confirm" % pick
    return {"agent": "CHIEF", "action": "propose", "candidate": pick, "text": text}


def final_pick(world, candidates):
    # no consensus after 3 rounds: the cheapest legal candidate. None if nothing is legal
    legal = [c for c in candidates if is_legal(world, c)]
    if not legal:
        return None
    return min(legal, key=lambda c: (soft_cost(world, c)["total"], c["id"]))
