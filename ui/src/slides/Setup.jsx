import { DIMENSIONS, envSummary } from '../lib/scenario.js'
import poolFile from '../../../data/pool.json'
import Icon from '../Icon.jsx'
import TailFin from '../TailFin.jsx'

const pool = poolFile.flights

// which desk feels which conditions. same names as the console columns
const DESKS = [
  { key: 'ATC', name: 'Tower', note: 'slots and separation' },
  { key: 'PILOT', name: 'Cockpit', note: 'fuel and passengers' },
  { key: 'GROUND', name: 'Ramp', note: 'gates and crew' },
]

// page 2: the judge sets the conditions and picks a real flight. nothing runs until "Run negotiation".
export default function Setup({ env, onEnv, poolIndex, onPoolIndex, onRun }) {
  const flight = pool.find(f => f.pool_index === poolIndex) || pool[0]

  return (
    <section className="slide slide--wide">
      <div className="slide-inner setup">
        <div className="setup-head">
          <h2>Set the conditions</h2>
          <p>Pick what the day looks like at {poolFile.airport || 'the airport'}, then one real delayed arrival. The three desks negotiate from there.</p>
        </div>

        <div className="setup-grid">
          <div className="conditions">
            {DESKS.map(desk => (
              <fieldset className="cond-group" key={desk.key}>
                <legend><b>{desk.name}</b> <span>{desk.note}</span></legend>
                {DIMENSIONS.filter(d => d.desk === desk.key).map(d => (
                  <div className="cond" key={d.key}>
                    <span className="cond-label" id={'lbl-' + d.key}>{d.label}</span>
                    <div className="seg" role="group" aria-labelledby={'lbl-' + d.key}>
                      {d.options.map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={env[d.key] === value}
                          onClick={() => onEnv({ ...env, [d.key]: value })}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </fieldset>
            ))}
          </div>

          <div className="flights">
            <div className="flights-head">
              <h3>Real flight</h3>
              <span className="tag tag--real">2015 US DOT data · {pool.length} delayed arrivals</span>
            </div>
            <div className="flight-list" role="radiogroup" aria-label="Real flight">
              {pool.map(f => {
                const on = f.pool_index === poolIndex
                return (
                  <label key={f.pool_index} className={'flight-row' + (on ? ' flight-row--on' : '')}>
                    <input type="radio" name="flight" checked={on} onChange={() => onPoolIndex(f.pool_index)} />
                    <TailFin flight={f.flight} />
                    <b className="mono">{f.flight}</b>
                    <span className="mono">{f.origin}→{f.destination}</span>
                    <span className="muted">{f.date}</span>
                    <span className="mono">{f.scheduled_arrival}</span>
                    <span className="late-by mono">+{f.delay_min}</span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="setup-go">
          <div className="setup-pick">
            {flight && <TailFin flight={flight.flight} size={44} />}
            <p>
              <b className="mono">{flight ? `${flight.flight} ${flight.origin}→${flight.destination}, +${flight.delay_min} min` : 'No flight'}</b>
              <span>{flight ? flight.airline + ' · ' : ''}{envSummary(env)}</span>
            </p>
          </div>
          <button className="btn btn--lg" onClick={onRun}>Run negotiation <Icon name="arrow" /></button>
        </div>
      </div>
    </section>
  )
}

