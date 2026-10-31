# Data

## Included

- `airlines.csv`: 14 airline IATA codes and names.
- `airports.csv`: 322 US airports with IATA code, name, city, state, latitude, longitude.
- `sample_event.json`: one hand-written disruption so the code runs without the big file.

## Not included: flights.csv

The hackathon Drive folder only had the two small files. The full dataset is
the US DOT "2015 Flight Delays and Cancellations" set, about 560 MB unzipped.

Get it from Kaggle (login needed):

    https://www.kaggle.com/datasets/usdot/flight-delays

Put `flights.csv` in this folder. It is git-ignored.

Columns we use: YEAR, MONTH, DAY, AIRLINE, FLIGHT_NUMBER, ORIGIN_AIRPORT,
DESTINATION_AIRPORT, SCHEDULED_DEPARTURE, SCHEDULED_ARRIVAL, DEPARTURE_DELAY,
ARRIVAL_DELAY, WEATHER_DELAY, LATE_AIRCRAFT_DELAY.

Per the problem statement, pick any row with WEATHER_DELAY > 15 or
LATE_AIRCRAFT_DELAY > 20. `src/pick_event.py` does this.

## Fields we make up

The dataset has no fuel, gate or crew data. `pick_event.py` adds these with
fixed, clearly labelled assumptions (see the top of that file). Say this in
the demo: synthetic fields are synthetic.

## About the flights.csv we actually have

The file downloaded on hackathon day is a 358,774-row subset (38 MB), not the full
5.8M-row Kaggle file. It covers Jan to Dec 2015 except October. ATL has 18,504 arrivals
in it, so the same-day arrival queue around a flight is sparser than reality (about 6%
of real traffic). Say this in the demo if asked.

`scripts/build_pool.py ../flights.csv` builds `data/pool.json` from it.
