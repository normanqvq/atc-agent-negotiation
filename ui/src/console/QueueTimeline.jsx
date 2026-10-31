import { toMin, fmt } from '../lib/time.js'

// the real arrival queue on a time axis, candidate slots underneath.
// lane 0 = the subject flight only. other flights spread over lanes 1-3 so a busy 5 minutes stays readable.
// the subject flight shows twice: a ghost at its scheduled time, a sign at its ETA, red line = the delay.
export default function QueueTimeline({ queue, subject, candidates, decision, blockedIds }) {
  const flights = (queue.flights || []).filter(f => f.sched_arrival && !f.is_subject)
  const sta = subject && subject.scheduled_arrival ? toMin(subject.scheduled_arrival) : null
  const eta = sta !== null ? sta + (subject.delay_min || 0) : null
  const times = [
    ...flights.map(f => toMin(f.sched_arrival)),
    ...candidates.filter(c => c.arrival).map(c => toMin(c.arrival)),
  ]
  if (eta !== null) times.push(eta, sta)
  if (times.length === 0) return null
  const start = Math.floor((Math.min(...times) - 10) / 10) * 10
  const end = Math.ceil((Math.max(...times) + 10) / 10) * 10
  const span = Math.max(end - start, 10)
  const pct = t => ((t - start) / span) * 100
  const step = span > 120 ? 30 : span > 60 ? 20 : 10

  const ticks = []
  for (let t = start; t <= end; t += step) ticks.push(t)
  const chosenId = decision ? decision.candidate : null

  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Arrival queue · {queue.airport || 'ATL'}</h3>
        <span className="note">Real same-day arrivals · wake category simulated · H = heavy</span>
      </div>
      <div className="timeline" role="img" aria-label={`Arrival timeline from ${fmt(start)} to ${fmt(end)} with ${candidates.length} candidate slots`}>
        <div className="axis" />
        {eta !== null && eta > sta && <div className="late" style={{ left: pct(sta) + '%', width: (pct(eta) - pct(sta)) + '%' }} />}
        {ticks.map(t => <div className="tick" key={t} style={{ left: pct(t) + '%' }}><span>{fmt(t)}</span></div>)}
        {flights.map((f, i) => (
          <div key={f.flight + i} className={'fl lane' + (i % 3 + 1) + ' ' + f.wake_category}
            style={{ left: pct(toMin(f.sched_arrival)) + '%' }} title={`${f.flight} ${f.sched_arrival} ${f.wake_category}`}>
            {f.flight}{f.wake_category === 'heavy' ? ' H' : ''}
          </div>
        ))}
        {sta !== null && eta - sta >= 12 && (
          <div className="fl sta lane0" style={{ left: pct(sta) + '%' }} title="subject flight, scheduled">
            {subject.flight} STA
          </div>
        )}
        {eta !== null && (
          <div className="fl subject lane0" style={{ left: pct(eta) + '%' }} title="subject flight, scheduled + delay">
            {subject.flight} ETA {fmt(eta)}
          </div>
        )}
        {candidates.filter(c => c.arrival).map(c => {
          const chosen = chosenId === c.id
          const blocked = blockedIds.has(c.id)
          return (
            <div key={c.id} className={'cand' + (chosen ? ' chosen' : '') + (blocked ? ' blocked' : '')}
              style={{ left: pct(toMin(c.arrival)) + '%' }} title={`#${c.id} ${c.arrival} ${c.gate} ${c.mode}`}>
              <i /><span>#{c.id}</span>
            </div>
          )
        })}
      </div>
      <div className="cands">
        {candidates.map(c => {
          const blocked = blockedIds.has(c.id)
          const chosen = chosenId === c.id
          return (
            <span key={c.id} className={'cand-chip' + (blocked ? ' cand-chip--blocked' : '') + (chosen ? ' cand-chip--chosen' : '')}>
              <b>#{c.id}</b>
              <span className="mono">{c.arrival}</span> {c.gate} · {String(c.mode || '').replace('_', ' ')}{c.note ? ' · ' + c.note : ''}
            </span>
          )
        })}
      </div>
    </div>
  )
}
