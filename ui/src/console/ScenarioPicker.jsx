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

// one row of dropdowns across the top, so the three desks get the whole screen
export default function ScenarioPicker({ env, onEnv, pool, poolIndex, onPoolIndex, onRun, running }) {
  return (
    <div className="picker">
      {DIMENSIONS.map(d => (
        <label className="pick" key={d.key}>
          <span>{d.label}</span>
          <select id={'pick-' + d.key} value={env[d.key]} onChange={e => onEnv({ ...env, [d.key]: e.target.value })}>
            {d.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      ))}
      <label className="pick pick--flight">
        <span>Real flight</span>
        <select id="pick-flight" value={poolIndex} onChange={e => onPoolIndex(Number(e.target.value))}>
          {pool.map(f => (
            <option key={f.pool_index} value={f.pool_index}>
              #{f.pool_index} {f.flight} {f.origin}→{f.destination} {f.date} +{f.delay_min}m
            </option>
          ))}
        </select>
      </label>
      <button className="btn" onClick={onRun} disabled={running}>{running ? 'Negotiating…' : 'Run'}</button>
    </div>
  )
}
