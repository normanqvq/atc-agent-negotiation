"""
Three independent Haiku agents: Tower (ATC), Cockpit (Pilot), Ramp (Ground).
Three different prompts, three separate API calls, run in parallel every round.
Not one prompt playing three roles.

Each agent only sees its own slice of the world, so it will happily propose
something another desk (or the rulebook) can't accept. We never put rule
check results in the prompt.

No ANTHROPIC_API_KEY, or a call fails -> that agent answers with a simple
hard-coded rule instead, so the demo never stops. usage["ai_enabled"] = False then.

usage: python -m src.agents
"""
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

from src import rules

MODEL = "claude-haiku-5-5"
MAX_TEXT = 140  # UI shows one short line per message

# label / sees are shown in the UI as-is, copied from data/sample_log.json
AGENTS = {
    "ATC": {"label": "Tower · ATC", "sees": "arrival slot table, wake category of neighbours, weather-reduced acceptance rate"},
    "PILOT": {"label": "Cockpit · Pilot", "sees": "fuel endurance, crew duty time left, connecting passengers"},
    "GROUND": {"label": "Ramp · Ground", "sees": "gate occupancy, ramp crew shift, this aircraft's next leg"},
}
ORDER = ["ATC", "PILOT", "GROUND"]

ROLE = {
    "ATC": (
        "You are the Tower (air traffic control) desk. You care about runway flow: "
        "keeping wake separation behind the aircraft in front (3 min behind a heavy, 2 min behind a medium) "
        "and not putting more arrivals into one 10-minute window than the weather-reduced acceptance rate allows."
    ),
    "PILOT": (
        "You are the Cockpit (pilot) desk of the late flight. You care about landing with enough fuel above the reserve, "
        "your crew's duty time, and getting connecting passengers to their next flight. "
        "Holding burns more fuel than slowing down en route."
    ),
    "GROUND": (
        "You are the Ramp (ground operations) desk. You care about having a free gate when the aircraft arrives, "
        "the ramp crew finishing the turnaround before their shift ends, and the aircraft's next departure leaving on time."
    ),
}

SYSTEM_TEMPLATE = (
    "{role}\n\n"
    "You are one of three independent desks negotiating a landing plan for one delayed arrival. "
    "A Chief (plain code) collects the answers. You only see your own data. "
    "You can only pick one of the numbered candidate plans; you cannot invent times or gates.\n\n"
    "You must call the respond tool exactly once. Its text field is ONE short English sentence, "
    "at most 15 words (under 100 characters), giving your reason with one number from your own data. "
    "Example: \"B12 occupied until 19:04, #3 gets B14 with the crew still on shift\"."
)


def round_actions(agent, round_no):
    if round_no == 1:
        return ["rank"] if agent == "ATC" else ["propose"]
    return ["accept", "counter"]


# ---------- what each desk sees ----------

def view_atc(world, cands):
    lines = ["Weather: %s. Runway configuration: %s." % (world["env"]["weather"], world["env"]["runway"].replace("_", " ")),
             "Acceptance rate right now: %d arrival(s) per 10-minute window." % world["sim"]["acceptance_per_10min"],
             "Windows are clock-aligned (18:40-18:49, 18:50-18:59, ...); an arrival counts in the window its minute falls in.",
             "Other arrivals already scheduled (flight, time, wake category):"]
    for f in world["arrival_queue"]["flights"]:
        lines.append("  %s %s %s" % (f["flight"], f["sched_arrival"], f["wake_category"]))
    lines.append("Our flight %s is wake category %s. Candidate landing times:" % (world["scenario"]["flight"], world["subject_wake"]))
    for c in cands:
        lines.append("  #%d lands %s" % (c["id"], c["arrival"]))
    return "\n".join(lines)


def view_pilot(world, cands):
    sim = world["sim"]
    lines = []
    if world["env"]["aircraft_status"] == "medical":
        lines.append("MEDICAL EMERGENCY on board: a passenger needs a hospital, landing early matters most.")
    if world["env"]["aircraft_status"] == "low_fuel":
        lines.append("LOW FUEL: we are carrying less fuel than planned.")
    lines += [
        "Our flight: %s, now expected at %s." % (world["scenario"]["flight"], world["eta"]),
        "Fuel: %d min of flying left at %s. Must land with at least %d min (reserve)." % (
            sim["fuel_endurance_min"], world["eta"], sim["min_reserve_min"]),
        "Each minute of holding burns 1.0 min of fuel, each minute of slowing down en route burns 0.4.",
        "Crew duty time left: %d min." % sim["flight_crew_duty_left_min"],
        "Connecting passengers: %d. They miss their connection if we land after %s." % (
            sim["connecting_pax"], sim["connection_cutoff"]),
        "Candidates (landing time, how we absorb the delay):",
    ]
    for c in cands:
        lines.append("  #%d lands %s, %s" % (c["id"], c["arrival"], c["mode"].replace("_", " ")))
    return "\n".join(lines)


def view_ground(world, cands):
    sim = world["sim"]
    lines = ["Our flight %s normally uses gate %s." % (world["scenario"]["flight"], sim["original_gate"]),
             "Gate occupancy (another aircraft parked from - to):"]
    for gate, busy in sim["gates"].items():
        if gate in sim["closed_gates"]:
            lines.append("  %s CLOSED" % gate)
        elif busy:
            lines.append("  %s %s" % (gate, ", ".join("%s-%s" % (a, b) for a, b in busy)))
        else:
            lines.append("  %s free" % gate)
    lines += [
        "Taxi in takes %d min, the turnaround needs the gate for %d min." % (rules.TAXI_MIN, rules.TURNAROUND_MIN),
        "Ramp crew shift ends %s. This aircraft's next departure is %s." % (sim["crew_shift_end"], sim["next_leg_departure"]),
        "Candidates (landing time, gate):",
    ]
    for c in cands:
        lines.append("  #%d lands %s, gate %s" % (c["id"], c["arrival"], c["gate"]))
    return "\n".join(lines)


VIEWS = {"ATC": view_atc, "PILOT": view_pilot, "GROUND": view_ground}


def task_text(agent, round_no, chief_proposal):
    if round_no == 1 and agent == "ATC":
        return ("Rank your top three candidates for runway flow. Use action rank, candidate = your first choice, "
                "and start the text with 'Ranking: #a > #b > #c.' followed by a very short reason.")
    if round_no == 1:
        return "Propose the one candidate that is best from your data. Use action propose."
    return ("The Chief proposes #%d: \"%s\"\n"
            "Reply accept (candidate %d) if you can live with it given your data, "
            "or counter with the one candidate you want instead." % (
                chief_proposal["candidate"], chief_proposal["text"], chief_proposal["candidate"]))


# ---------- rule-based answers (no key, or the call failed) ----------
# each desk only uses its own domain: ATC -> wake + capacity, Pilot -> fuel + connections, Ground -> gates

def atc_ok(world, c):
    return rules.check_wake(world, c)["status"] == "pass" and rules.check_capacity(world, c)["status"] == "pass"


def pilot_ok(world, c):
    return rules.fuel_at_landing(world, c) >= world["sim"]["min_reserve_min"]


def ground_ok(world, c):
    return rules.gate_conflict(world, c["gate"], c["arrival"]) is None


OK = {"ATC": atc_ok, "PILOT": pilot_ok, "GROUND": ground_ok}


def favourite(agent, world, cands):
    # the candidate this desk likes best, plus a reason
    if agent == "ATC":
        good = [c for c in cands if atc_ok(world, c)]
        if not good:
            return cands[-1], "No clean slot, #%d is the least bad" % cands[-1]["id"]
        ranking = " > ".join("#%d" % c["id"] for c in good[:3])
        return good[0], "Ranking: %s. %s allows %d arrival(s) per 10 min" % (
            ranking, world["env"]["weather"].capitalize(), world["sim"]["acceptance_per_10min"])

    if agent == "PILOT":
        cutoff = rules.t(world, world["sim"]["connection_cutoff"])
        fuel_ok = [c for c in cands if pilot_ok(world, c)]
        on_time = [c for c in fuel_ok if rules.t(world, c["arrival"]) <= cutoff]
        pick = (on_time or fuel_ok or cands)[0]
        if world["env"]["aircraft_status"] == "medical":
            return pick, "Medical emergency on board, request earliest landing #%d at %s" % (pick["id"], pick["arrival"])
        return pick, "Request #%d at %s: %.0f min fuel at landing, protects %d connecting passengers" % (
            pick["id"], pick["arrival"], rules.fuel_at_landing(world, pick), world["sim"]["connecting_pax"])

    # GROUND: free gate, original gate preferred, then earliest
    free = [c for c in cands if ground_ok(world, c)]
    original = [c for c in free if c["gate"] == world["sim"]["original_gate"]]
    pick = (original or free or cands)[0]
    return pick, "#%d at %s gets gate %s free, ramp shift ends %s" % (
        pick["id"], pick["arrival"], pick["gate"], world["sim"]["crew_shift_end"])


def rule_based_answer(agent, world, cands, round_no, chief_proposal):
    pick, reason = favourite(agent, world, cands)
    if round_no == 1:
        return {"agent": agent, "action": round_actions(agent, 1)[0], "candidate": pick["id"], "text": reason}
    proposed = next(c for c in cands if c["id"] == chief_proposal["candidate"])
    if OK[agent](world, proposed):
        return {"agent": agent, "action": "accept", "candidate": proposed["id"], "text": "Accept #%d" % proposed["id"]}
    return {"agent": agent, "action": "counter", "candidate": pick["id"],
            "text": "Cannot take #%d. %s" % (proposed["id"], reason)}


# ---------- Haiku ----------

_client = None


def get_client():
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic(max_retries=1, timeout=30.0)
    return _client


def respond_tool(actions, ids):
    return {
        "name": "respond",
        "description": "Send your answer to the Chief. Call this exactly once.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "action": {"type": "string", "enum": actions},
                "candidate": {"type": "integer", "enum": ids, "description": "candidate plan id"},
                "text": {"type": "string", "description": "one English sentence, at most 15 words, with your reason"},
            },
            "required": ["action", "candidate", "text"],
            "additionalProperties": False,
        },
    }


def ask_haiku(agent, world, cands, round_no, chief_proposal):
    # one API call for one desk. returns (message, tokens). raises on anything weird
    actions = round_actions(agent, round_no)
    ids = [c["id"] for c in cands]
    response = get_client().messages.create(
        model=MODEL,
        max_tokens=2000,  # thinking uses this budget too
        output_config={"effort": "low"},
        system=SYSTEM_TEMPLATE.format(role=ROLE[agent]),
        tools=[respond_tool(actions, ids)],
        tool_choice={"type": "auto"},
        messages=[{"role": "user", "content": VIEWS[agent](world, cands) + "\n\n" + task_text(agent, round_no, chief_proposal)}],
    )
    tokens = response.usage.input_tokens + response.usage.output_tokens
    answer = None
    for block in response.content:
        if block.type == "tool_use" and block.name == "respond":
            answer = block.input
    if answer is None:
        raise ValueError("no respond call (stop_reason=%s)" % response.stop_reason)

    action = answer.get("action")
    candidate = answer.get("candidate")
    text = str(answer.get("text", "")).strip()
    if action not in actions or candidate not in ids or not text:
        raise ValueError("bad answer %r" % answer)
    # keep accept / counter honest: accept always means the Chief's candidate
    if action == "accept":
        candidate = chief_proposal["candidate"]
    if action == "counter" and candidate == chief_proposal["candidate"]:
        action = "accept"
    if len(text) > MAX_TEXT:
        text = text[:MAX_TEXT - 1].rstrip() + "…"
    return {"agent": agent, "action": action, "candidate": candidate, "text": text}, tokens


def ask_one(agent, world, cands, round_no, chief_proposal, use_ai):
    # returns (message, tokens, used_ai)
    if use_ai:
        try:
            msg, tokens = ask_haiku(agent, world, cands, round_no, chief_proposal)
            return msg, tokens, True
        except Exception as e:  # any failure -> rule-based, the demo must not stop
            print("[agents] %s round %d fell back to rules: %s" % (agent, round_no, e), file=sys.stderr)
    return rule_based_answer(agent, world, cands, round_no, chief_proposal), 0, False


def ai_available():
    return bool(os.environ.get("ANTHROPIC_API_KEY"))


def ask_agents(world, candidates, round_no, chief_proposal):
    # all three desks in parallel. returns (messages in order ATC, PILOT, GROUND, usage)
    use_ai = ai_available()
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(ask_one, a, world, candidates, round_no, chief_proposal, use_ai) for a in ORDER]
        results = [f.result() for f in futures]
    messages = [r[0] for r in results]
    usage = {
        "tokens": sum(r[1] for r in results),
        "ai_enabled": all(r[2] for r in results),
        "fallback_calls": sum(1 for r in results if not r[2]),
    }
    return messages, usage


if __name__ == "__main__":
    from src.scenario import build_scenario
    from src.candidates import build_candidates

    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass

    world = build_scenario(1, {"weather": "thunderstorm", "runway": "single"})
    cands = build_candidates(world)
    start = time.time()
    messages, usage = ask_agents(world, cands, 1, None)
    for m in messages:
        print("%-6s %-7s #%d  %s" % (m["agent"], m["action"], m["candidate"], m["text"]))
    print("usage", usage, "took %.1fs" % (time.time() - start))
