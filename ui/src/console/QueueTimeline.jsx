import { toMin, fmt } from '../lib/time.js'

// the real arrival queue on a time axis, candidate slots underneath
export default function QueueTimeline({ queue, candidates, decision, blockedIds }) {
  const flights = queue.flights.filter(f => !f.is_subject)
  const times = [...flights.map(f => toMin(f.sched_arrival)), ...candidates.map(c => toMin(c.arrival))]
  if (times.length === 0) return null
  const start = Math.floor((Math.min(...times) - 10) / 10) * 10
  const end = Math.ceil((Math.max(...times) + 10) / 10) * 10
  const pct = t => ((t - start) / (end - start)) * 100

  const ticks = []
  for (let t = start; t <= end; t += 10) ticks.push(t)

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Arrival queue at {queue.airport || 'ATL'}</h3>
        <span className="who who--code">real same-day arrivals · wake category sim</span>
      </div>
      <div className="timeline" aria-label="Arrival timeline">
        <div className="axis" />
        {ticks.map(t => <div className="tick" key={t} style={{ left: pct(t) + '%' }}><span>{fmt(t)}</span></div>)}
        {flights.map(f => (
          <div key={f.flight} className={'fl ' + f.wake_category} style={{ left: pct(toMin(f.sched_arrival)) + '%' }} title={f.wake_category}>
            {f.flight}{f.wake_category === 'heavy' ? ' H' : ''}
          </div>
        ))}
        {candidates.map(c => {
          const chosen = decision && decision.candidate === c.id
          const blocked = blockedIds.has(c.id)
          return (
            <div key={c.id} className={'cand' + (chosen ? ' chosen' : '') + (blocked ? ' blocked' : '')}
              style={{ left: pct(toMin(c.arrival)) + '%' }} title={`#${c.id} ${c.arrival} ${c.gate} ${c.mode}`}>#{c.id}</div>
          )
        })}
      </div>
      <div className="chips">
        {candidates.map(c => (
          <span key={c.id} className={'chip' + (blockedIds.has(c.id) ? ' chip--sim' : '')}>
            #{c.id} {c.arrival} · {c.gate} · {c.mode.replace('_', ' ')}{c.note ? ' · ' + c.note : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
