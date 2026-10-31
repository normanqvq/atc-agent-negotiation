// looks like a paper flight progress strip: one box per fact, REAL or SIM tagged
export default function FlightStrip({ scenario }) {
  const s = scenario
  const parts = Object.entries(s.delay_breakdown || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k.replace('_', ' ')} ${v}`)
  const cause = parts.length ? parts.join(' · ') : 'not attributed'

  return (
    <div className="panel" id={'row-' + s.row_id}>
      <div className="panel-title">
        <h3>Disruption</h3>
        <div className="chips">
          <span className="chip chip--real">REAL · flights.csv row {s.row_id}</span>
          <span className="chip chip--sim">SIM · gate, fuel, crew, connections</span>
        </div>
      </div>
      <div className="strip">
        <div className="strip-cell"><small>Callsign</small><b>{s.flight}</b><span className="sub">{s.airline}</span></div>
        <div className="strip-cell"><small>Route</small><b>{s.origin}→{s.destination}</b><span className="sub">{s.date}</span></div>
        <div className="strip-cell"><small>STA</small><b>{s.scheduled_arrival}</b><span className="sub">scheduled arrival</span></div>
        <div className="strip-cell strip-cell--delay"><small>Delay</small><b>+{s.delay_min}</b><span className="sub">minutes</span></div>
        <div className="strip-cell"><small>Cause</small><b style={{ fontSize: 14 }}>{cause}</b><span className="sub">from the DOT delay columns</span></div>
      </div>
    </div>
  )
}
