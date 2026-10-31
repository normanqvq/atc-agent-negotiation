"""Deterministic chief: safety first, then ATC 3 / PILOT 2 / GROUND 1."""
from src.rules import first_block, soft_cost

WEIGHTS = {"ATC": 3, "PILOT": 2, "GROUND": 1}


def final_pick(world, candidates):
    legal = [c for c in candidates if first_block(world, c) is None]
    return min(legal, key=lambda c: (soft_cost(world, c)["total"], c["id"]), default=None)


def rule_on_round(world, candidates, messages, round_no, current_proposal):
    legal = {c["id"]: c for c in candidates if first_block(world, c) is None}
    # Exactly one answer per desk is required; duplicated desks cannot form consensus.
    desks = {m["agent"] for m in messages}
    complete = len(messages) == 3 and desks == set(WEIGHTS)
    valid = [m for m in messages if not m.get("blocked_by") and m.get("candidate") in legal]
    same = len(valid) == 3 and len({m["candidate"] for m in valid}) == 1
    accepts = current_proposal and all(
        m.get("action") == "accept" and m["candidate"] == current_proposal["candidate"]
        for m in valid
    )
    if complete and same and (round_no == 1 or accepts):
        return {"agent": "CHIEF", "action": "decide", "candidate": valid[0]["candidate"],
                "text": "All three agree. Consensus in round %d" % round_no}

    scores = {}
    for m in valid:
        cid = m["candidate"]
        scores[cid] = scores.get(cid, 0) + WEIGHTS.get(m["agent"], 0)
    if scores:
        cid = min(scores, key=lambda i: (-scores[i], soft_cost(world, legal[i])["total"], i))
        chosen = legal[cid]
    else:
        chosen = final_pick(world, candidates)
    if chosen is None:
        return {"agent": "CHIEF", "action": "decide", "candidate": None,
                "text": "No safe plan. Hand to the duty manager."}
    # one line per blocked candidate, listing the desks that asked for it
    blocked = {}
    for m in messages:
        if m.get("blocked_by"):
            blocked.setdefault((m["candidate"], m["blocked_by"]), []).append(m["agent"].capitalize())
    parts = ["#%s (%s) blocked by %s" % (cand, "/".join(desks), rule) for (cand, rule), desks in blocked.items()]
    reason = "; ".join(parts) if parts else "Desks disagree"
    return {"agent": "CHIEF", "action": "propose", "candidate": chosen["id"],
            "text": "%s. Compromise: #%d. Please confirm" % (reason, chosen["id"])}


if __name__ == "__main__":
    from src.scenario import build_scenario
    from src.candidates import build_candidates
    w = build_scenario(1, {})
    print(final_pick(w, build_candidates(w)))
