import './weather.css'

// every condition the judge changed from normal, as yellow airfield signs in the top-right corner.
// all normal -> nothing
const LABELS = {
  weather: { fog: 'Fog', thunderstorm: 'Thunderstorm' },
  runway: { single: 'Single runway', one_closed: 'One runway closed' },
  aircraft_status: { low_fuel: 'Low fuel', medical: 'Medical emergency' },
  terminal: { tight: 'Gates tight', zone_closed: 'Terminal zone closed' },
  ground_crew: { shift_ending: 'Ramp shift ending' },
  passengers: { many_connecting: 'Many connecting' },
}

export default function ConditionSigns({ env }) {
  const picked = Object.keys(LABELS).filter(key => LABELS[key][env[key]])
  if (picked.length === 0) return null
  return (
    <div className="cond-signs">
      {picked.map(key => <span key={key} className="sign cond-sign">{LABELS[key][env[key]]}</span>)}
    </div>
  )
}
