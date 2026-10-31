import { toMin, fmt } from '../lib/time.js'

// the real arrival queue on a time axis, candidate slots underneath.
// flights are spread over 3 lanes so a busy 5 minutes stays readable.
export default function QueueTimeline({ queue, subject, candidates, decision, blockedIds }) {
  const flights = (queue.flights || []).filter(f => f.sched_arrival)
  const eta = subject && subject.scheduled_arrival ? toMin(subject.scheduled_arrival) + (subject.delay_min || 0) : null
  const times = [
    ...flights.map(f => toMin(f.sched_arrival)),
    ...candidates.filter(c => c.arrival).map(c => toMin(c.arrival)),
  ]
  if (eta !== null) times.push(eta)
  if (times.length === 0) return null
  const start = Math.floor((Math.min(...times) - 10) / 10) * 10
  const end = Math.ceil((Math.max(...times) + 10) / 10) * 10
  const span = Math.max(end - start, 10)
  const pct = t => ((t - start) / span) * 100
  const step = span > 120 ? 30 : span > 60 ? 20 : 10

  const ticks = []
  for (let t = start; t <= end; t += step) ticks.push(t)

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Arrival queue at {queue.airport || 'ATL'}</h3>
        <span className="who who--code">real same-day arrivals · wake category SIM · H = heavy</span>
      </div>
      <div className="timeline" aria-label="Arrival timeline">
        <div className="axis" />
        {ticks.map(t => <div className="tick" key={t} style={{ left: pct(t) + '%' }}><span>{fmt(t)}</span></div>)}
        {flights.map((f, i) => (
          <div key={f.flight + i} className={'fl lane' + (i % 3) + ' ' + f.wake_category}
            style={{ left: pct(toMin(f.sched_arrival)) + '%' }} title={f.wake_category}>
            {f.flight}{f.wake_category === 'heavy' ? ' H' : ''}
          </div>
        ))}
        {eta !== null && (
          <div className="fl subject lane0" style={{ left: pct(eta) + '%' }} title="subject flight, scheduled + delay">
            {subject.flight} ETA {fmt(eta)}
          </div>
        )}
        {candidates.filter(c => c.arrival).map(c => {
          const chosen = decision && decision.candidate === c.id
          const blocked = blockedIds.has(c.id)
          return (
            <div key={c.id} className={'cand' + (chosen ? ' chosen' : '') + (blocked ? ' blocked' : '')}
              style={{ left: pct(toMin(c.arrival)) + '%' }} title={`#${c.id} ${c.arrival} ${c.gate} ${c.mode}`}>
              <i /><span>#{c.id}</span>
            </div>
          )
        })}
      </div>
      <div className="chips">
        {candidates.map(c => (
          <span key={c.id} className={'chip' + (blockedIds.has(c.id) ? ' chip--sim' : '')}>
            #{c.id} {c.arrival} · {c.gate} · {String(c.mode || '').replace('_', ' ')}{c.note ? ' · ' + c.note : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
