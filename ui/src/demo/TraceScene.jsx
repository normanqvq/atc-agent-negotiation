import Icon from '../Icon.jsx'
import { lookup } from '../lib/run.js'

// every claim in the plan -> the message, rule check or data row behind it
export default function TraceScene({ log }) {
  const trace = log.decision.trace || []
  return (
    <section className="scene">
      <div className="scene-head">
        <h2>Every part of the plan traces back.</h2>
        <p className="scene-sub">Each claim links to the agent message, rule check or data row it came from.</p>
      </div>
      <div className="trace-list">
        {trace.map((t, i) => (
          <div className="trace-line" key={i} style={{ animationDelay: (0.1 + i * 0.25) + 's' }}>
            <p className="trace-claim">{t.claim}</p>
            <div className="trace-src">
              {t.links.map((id, j) => <Source key={id + j} item={lookup(log, id)} log={log} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Source({ item, log }) {
  if (item.kind === 'msg') {
    const a = log.agents[item.m.agent]
    return (
      <div className="src-card">
        <span className="src-who src-who--llm">{a ? a.label : 'Chief · code'} · round {item.round}</span>
        <p>{item.m.text}</p>
      </div>
    )
  }
  if (item.kind === 'rule') {
    const r = item.rule
    return (
      <div className="src-card">
        <span className="src-who">
          {r.status === 'blocked' ? <span className="sign sign--stop">{r.id}</span> : <><Icon name="check" /> <b className="mono">{r.id}</b></>}
          {r.name}
        </span>
        <p>{r.detail}</p>
        <small>{r.source}</small>
      </div>
    )
  }
  return <div className="src-card"><span className="src-who mono">{item.id}</span></div>
}
