// the 6 environment dimensions the judge can set. value -> label
// desk = which agent mostly feels this condition (only used to group them on the setup page)
export const DIMENSIONS = [
  { key: 'weather',         label: 'Weather',    desk: 'ATC',    options: [['clear', 'Clear'], ['fog', 'Fog'], ['thunderstorm', 'Thunderstorm']] },
  { key: 'runway',          label: 'Runways',    desk: 'ATC',    options: [['dual', 'Dual'], ['single', 'Single'], ['one_closed', 'One closed']] },
  { key: 'aircraft_status', label: 'Aircraft',   desk: 'PILOT',  options: [['normal', 'Normal'], ['low_fuel', 'Low fuel'], ['medical', 'Medical emergency']] },
  { key: 'passengers',      label: 'Passengers', desk: 'PILOT',  options: [['few', 'Few connecting'], ['many_connecting', 'Many connecting']] },
  { key: 'terminal',        label: 'Terminal',   desk: 'GROUND', options: [['normal', 'Normal'], ['tight', 'Gates tight'], ['zone_closed', 'Zone closed']] },
  { key: 'ground_crew',     label: 'Ramp crew',  desk: 'GROUND', options: [['normal', 'Normal'], ['shift_ending', 'Shift ending']] },
]

export function defaultEnvironment() {
  const env = {}
  for (const d of DIMENSIONS) env[d.key] = d.options[0][0]
  return env
}

// short text of only the conditions that differ from normal, e.g. "Thunderstorm · Single runway"
export function envSummary(env) {
  const parts = []
  for (const d of DIMENSIONS) {
    if (env[d.key] !== d.options[0][0]) parts.push(d.label + ': ' + d.options.find(o => o[0] === env[d.key])[1])
  }
  return parts.length ? parts.join(' · ') : 'All conditions normal'
}
