# "HH:MM" <-> minutes. same maths as ui/src/lib/time.js so both sides agree.
DAY = 24 * 60


def to_min(hhmm):
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def fmt(minutes):
    minutes = minutes % DAY
    return "%02d:%02d" % (minutes // 60, minutes % 60)


def near(t, anchor):
    # put minute t on the same "day" as anchor, so a flight at 00:20 after an
    # ETA of 23:50 is treated as +30, not -1410. keeps midnight from breaking math.
    return anchor + ((t - anchor + DAY // 2) % DAY - DAY // 2)
