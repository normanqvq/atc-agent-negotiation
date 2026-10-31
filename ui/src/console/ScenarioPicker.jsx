// the 6 environment dimensions the judge can set. value -> label
export const DIMENSIONS = [
  { key: 'weather',         label: 'Weather',    options: [['clear', 'Clear'], ['fog', 'Fog'], ['thunderstorm', 'Thunderstorm']] },
  { key: 'runway',          label: 'Runways',    options: [['dual', 'Dual'], ['single', 'Single'], ['one_closed', 'One closed']] },
  { key: 'aircraft_status', label: 'Aircraft',   options: [['normal', 'Normal'], ['low_fuel', 'Low fuel'], ['medical', 'Medical emergency']] },
  { key: 'terminal',        label: 'Terminal',   options: [['normal', 'Normal'], ['tight', 'Gates tight'], ['zone_closed', 'Zone closed']] },
  { key: 'ground_crew',     label: 'Ramp crew',  options: [['normal', 'Normal'], ['shift_ending', 'Shift ending']] },
  { key: 'passengers',      label: 'Passengers', options: [['few', 'Few connecting'], ['many_connecting', 'Many connecting']] },
]

export function defaultEnvironment() {
  const env = {}
  for (const d of DIMENSIONS) env[d.key] = d.options[0][0]
  return env
}

export function labelFor(key, value) {
  const d = DIMENSIONS.find(x => x.key === key)
  const o = d && d.options.find(x => x[0] === value)
  return o ? o[1] : value
}

export default function ScenarioPicker({ env, onEnv, pool, poolIndex, onPoolIndex, onRun, running, compact, onChange }) {
  // after a run we collapse to a row of chips so the screen is about the negotiation
  if (compact) {
    return (
      <div className="panel">
        <div className="panel-title"><h3>Scenario</h3><span className="who who--human">set by judge</span></div>
        <div className="chips">
          {DIMENSIONS.map(d => <span key={d.key} className="chip chip--env">{d.label}: {labelFor(d.key, env[d.key])}</span>)}
        </div>
        <div className="btn-row">
          <button className="btn btn--ghost" onClick={onChange}>Change scenario</button>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-title"><h3>Set the scenario</h3><span className="who who--human">judge</span></div>
      {DIMENSIONS.map(d => (
        <div className="dim" key={d.key}>
          <span className="dim-label">{d.label}</span>
          <div className="seg" role="group" aria-label={d.label}>
            {d.options.map(([value, label]) => (
              <button
                key={value}
                aria-pressed={env[d.key] === value}
                onClick={() => onEnv({ ...env, [d.key]: value })}
              >{label}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="dim">
        <span className="dim-label">Real flight (2015 US DOT data)</span>
        <div className="pool-select">
          <select id="pool-index" value={poolIndex} onChange={e => onPoolIndex(Number(e.target.value))}>
            {pool.map(f => (
              <option key={f.pool_index} value={f.pool_index}>
                #{f.pool_index} · {f.flight} {f.origin}→{f.destination} · {f.date} · +{f.delay_min} min
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="btn-row">
        <button className="btn" onClick={onRun} disabled={running}>{running ? 'Negotiating…' : 'Run negotiation'}</button>
      </div>
    </div>
  )
}
