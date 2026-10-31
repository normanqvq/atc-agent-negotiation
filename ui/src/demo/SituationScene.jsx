import QueueTimeline from './QueueTimeline.jsx'
import { envSummary } from '../lib/scenario.js'

// first beat of the live run: which flight, how late, and the slots code built for it
export default function SituationScene({ log, ranEnv }) {
  const s = log.scenario
  const parts = Object.entries(s.delay_breakdown || {})
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k.replace('_', ' ')} ${v} min`)
  const cause = parts.length ? parts.join(' · ') : 'not attributed'

  return (
    <section className="scene">
      <div className="scene-head">
        <h2>{s.flight} is {s.delay_min} minutes late into {s.destination}.</h2>
        <p className="scene-sub">
          {s.airline} · {s.origin}→{s.destination} · scheduled <span className="mono">{s.scheduled_arrival}</span> · {s.date} · cause: {cause}
        </p>
        <div className="tags">
          <span className="tag tag--real">Real · US DOT 2015, row <span className="mono">{s.row_id}</span></span>
          <span className="tag tag--sim">Simulated · gate, fuel, crew, connections</span>
          <span className="tag tag--cond">{envSummary(ranEnv)}</span>
        </div>
      </div>
      <div className="scene-body situation">
        <QueueTimeline
          queue={{ ...log.arrival_queue, airport: s.destination }}
          subject={s}
          candidates={log.candidates}
          decision={null}
          blockedIds={new Set()}
        />
      </div>
    </section>
  )
}
