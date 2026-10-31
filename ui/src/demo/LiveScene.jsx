import { useEffect, useState } from 'react'
import Icon from '../Icon.jsx'
import { envSummary } from '../lib/scenario.js'

// the screen right after "Run negotiation".
// while the backend works: data flows into code and out to the three Haiku agents, the timer runs.
// when the log comes back: it plays out beat by beat through the same diagram.

const ORDER = ['ATC', 'PILOT', 'GROUND']
const X = { ATC: 170, PILOT: 530, GROUND: 890 } // centre of each agent column in the diagram
const MID = 530
const BEAT_MS = 900

// one beat = one thing happening. built from the log
function buildBeats(log) {
  const beats = [{ type: 'cands' }]
  for (const r of log.rounds) {
    beats.push({ type: 'ask', round: r.round })
    beats.push({ type: 'answers', round: r.round })
    beats.push({ type: 'gate', round: r.round })
    if (r.messages.some(m => m.agent === 'CHIEF')) beats.push({ type: 'chief', round: r.round })
  }
  beats.push({ type: 'plan' })
  return beats
}

// little dots travelling along a path. key changes -> they start again
function Packets({ paths, kind, loop }) {
  return paths.map((d, i) => [0, 0.18, 0.36].map(delay => (
    <i key={i + '-' + delay} className={'packet packet--' + kind + (loop ? ' packet--loop' : '')}
      style={{ offsetPath: `path('${d}')`, animationDelay: delay + 's' }} />
  )))
}

export default function LiveScene({ log, flight, env, runStart, runMs }) {
  const [now, setNow] = useState(performance.now())
  const [beat, setBeat] = useState(0)
  const running = !log

  // timer: tick while the backend is working
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(performance.now()), 50)
    return () => clearInterval(t)
  }, [running])

  // playback: one beat every BEAT_MS once the log is here
  const beats = log ? buildBeats(log) : []
  useEffect(() => {
    if (!log) return
    setBeat(0)
    let b = 0
    const t = setInterval(() => {
      b += 1
      setBeat(b)
      if (b >= beats.length - 1) clearInterval(t)
    }, BEAT_MS)
    return () => clearInterval(t)
  }, [log])

  const ms = running ? now - runStart : (log.meta && log.meta.elapsed_s ? log.meta.elapsed_s * 1000 : runMs)
  const cur = beats[beat]
  const seen = beats.slice(0, beat + 1)
  const roundOf = type => { const s = seen.filter(x => x.type === type); return s.length ? s[s.length - 1].round : 0 }
  const answered = roundOf('answers')
  const gated = roundOf('gate')
  const ruled = roundOf('chief')
  const round = cur && cur.round ? cur.round : answered
  const asking = cur && cur.type === 'ask'
  const done = log && beat >= beats.length - 1
  const aiEnabled = !log || log.meta?.ai_enabled !== false
  const noSafePlan = log?.decision.status === 'no_safe_plan'
  const msgs = r => (log.rounds.find(x => x.round === r) || { messages: [] }).messages
  const chief = ruled ? msgs(ruled).find(m => m.agent === 'CHIEF') : null

  // what the inputs say. after the run, the log's own flight (it can differ when the sample plays)
  const s = log ? log.scenario : flight
  const queueN = log ? log.arrival_queue.flights.length : (flight.arrival_queue || []).length

  // packets for whatever is happening right now
  let packets = null
  if (running) {
    packets = <>
      <Packets kind="data" loop paths={[170, 530, 890].map(x => `M${x} 56 L${MID} 100`)} />
      <Packets kind="data" loop paths={ORDER.map(a => `M${MID} 150 L${X[a]} 210`)} />
    </>
  } else if (cur) {
    if (cur.type === 'cands') packets = <Packets kind="data" paths={[170, 530, 890].map(x => `M${x} 56 L${MID} 100`)} />
    if (cur.type === 'ask') packets = cur.round === 1
      ? <Packets kind="data" paths={ORDER.map(a => `M${MID} 150 L${X[a]} 210`)} />
      : <Packets kind="chief" paths={ORDER.map(a => `M${MID} 480 L${X[a]} 340`)} />
    if (cur.type === 'gate') packets = <Packets kind="llm" paths={ORDER.map(a => `M${X[a]} 340 L${X[a]} 392`)} />
    if (cur.type === 'chief') packets = <Packets kind="chief" paths={ORDER.map(a => `M${X[a]} 440 L${MID} 480`)} />
    if (cur.type === 'plan') packets = <Packets kind="chief" paths={[`M${MID} 530 L${MID} 562`]} />
  }

  // running list of what happened, newest at the bottom
  const feed = []
  if (log) for (const b of seen) {
    if (b.type === 'cands') feed.push({ k: 'code', t: `Code built ${log.candidates.length} candidate slots` })
    if (b.type === 'answers') for (const m of msgs(b.round)) if (m.agent !== 'CHIEF') {
      feed.push({ k: 'llm', t: `${log.agents[m.agent].label.split(' · ')[0]} ${m.action}${m.candidate ? ' #' + m.candidate : ''}` })
    }
    if (b.type === 'gate') {
      const blocked = msgs(b.round).filter(m => m.blocked_by)
      if (blocked.length === 0) feed.push({ k: 'pass', t: 'Every proposal passes the rulebook' })
      for (const m of blocked) feed.push({ k: 'stop', t: `${m.blocked_by} blocks ${log.agents[m.agent].label.split(' · ')[0]} #${m.candidate}` })
    }
    if (b.type === 'chief') { const c = msgs(b.round).find(m => m.agent === 'CHIEF'); feed.push({ k: 'code', t: `Chief: ${c.text}` }) }
    if (b.type === 'plan') feed.push({ k: 'human', t: 'Plan ready · waiting for the duty manager' })
  }

  return (
    <section className="scene scene--live">
      <div className="scene-head">
        <h2>{done ? (noSafePlan ? 'No safe plan.' : 'Negotiated.') : 'Negotiating live'}</h2>
      </div>

      <div className="live">
        <div className="flow">
          {/* connectors */}
          <svg className="wires" viewBox="0 0 1060 620" aria-hidden="true">
            {[170, 530, 890].map(x => <path key={'i' + x} d={`M${x} 56 L${MID} 100`} />)}
            {ORDER.map(a => <path key={'c' + a} d={`M${MID} 150 L${X[a]} 210`} />)}
            {ORDER.map(a => <path key={'g' + a} d={`M${X[a]} 340 L${X[a]} 392`} />)}
            {ORDER.map(a => <path key={'h' + a} d={`M${X[a]} 440 L${MID} 480`} />)}
            <path d={`M${MID} 530 L${MID} 562`} />
          </svg>

          {/* inputs */}
          <div className="node node--input" style={{ left: 170 - 160, top: 0 }}>
            <small>Real flight · DOT 2015</small>
            <b className="mono">{s.flight} {s.origin}→{s.destination} +{s.delay_min}</b>
          </div>
          <div className="node node--input" style={{ left: 530 - 160, top: 0 }}>
            <small>Real arrival queue</small>
            <b className="mono">{queueN} arrivals at {s.destination}</b>
          </div>
          <div className="node node--input" style={{ left: 890 - 160, top: 0 }}>
            <small>Conditions · judge's pick</small>
            <b>{envSummary(env)}</b>
          </div>

          {/* code builds candidates */}
          <div className={'node node--code' + (log ? ' on' : ' busy')} style={{ left: MID - 230, top: 100 }}>
            <span className="sign sign--code">Code</span>
            {log
              ? <span className="mono">{log.candidates.map(c => '#' + c.id + ' ' + c.arrival).join('  ')}</span>
              : <span>building candidate slots…</span>}
          </div>

          {/* the three Haiku agents */}
          {ORDER.map((a, i) => {
            const label = log ? log.agents[a].label : ['Tower · ATC', 'Cockpit · Pilot', 'Ramp · Ground'][i]
            const m = answered && !asking ? msgs(answered).find(x => x.agent === a) : null
            const thinking = running || asking
            const blocked = m && m.blocked_by && gated === answered
            return (
              <div key={a} className={'node node--agent' + (thinking ? ' thinking' : '') + (blocked ? ' blocked' : '')}
                style={{ left: X[a] - 160, top: 210 }}>
                <div className="agent-head"><h3>{label}</h3><span className="haiku">{aiEnabled ? 'Haiku' : 'Rules'}</span></div>
                {thinking && <p className="agent-think">thinking<span>.</span><span>.</span><span>.</span></p>}
                {!thinking && m && (
                  <div className="agent-say" key={m.id}>
                    <span className="agent-act">{m.action}{m.candidate ? <span className="ref">#{m.candidate}</span> : null}</span>
                    <p>{m.text}</p>
                  </div>
                )}
                {!thinking && !m && <p className="agent-think">{noSafePlan ? 'not called · no legal candidates' : 'waiting'}</p>}
              </div>
            )
          })}

          {/* the rulebook gate */}
          <div className="gate" style={{ top: 392 }}>
            <div className="holdshort" />
            <span className="sign sign--code gate-label">Rulebook · code</span>
            {gated > 0 && gated === answered && !asking && ORDER.map(a => {
              const m = msgs(gated).find(x => x.agent === a)
              if (!m) return null
              return (
                <span key={a + gated} className="gate-mark" style={{ left: X[a] }}>
                  {m.blocked_by
                    ? <span className="sign sign--stop"><Icon name="x" />{m.blocked_by}</span>
                    : <span className="pass"><Icon name="check" /></span>}
                </span>
              )
            })}
          </div>

          {/* chief */}
          <div className={'node node--chief' + (chief ? ' on' : '')} style={{ left: 0, top: 480 }}>
            <span className="who">Chief · code</span>
            <p key={chief ? chief.id : 'none'}>{chief ? chief.text : noSafePlan ? 'All candidates blocked. Hand to the duty manager.' : 'waits for all three answers'}</p>
          </div>

          {/* plan */}
          <div className={'node node--plan' + (done ? ' on' : '')} style={{ left: 0, top: 562 }}>
            <span className="who">Plan</span>
            <p>{done ? log.decision.summary : '—'}</p>
            {done && <span className="stamp-sm">Awaiting duty manager</span>}
          </div>

          {packets}
        </div>

        <aside className="live-side">
          <div className="timer">
            <small>{running ? 'Elapsed' : 'Negotiated in'}</small>
            <b className="mono">{(ms / 1000).toFixed(ms < 1 ? 6 : ms < 100 ? 3 : 1)}<span>s</span></b>
            <p>{aiEnabled ? '3 Haiku agents, called in parallel each round' : 'Rule-based fallback · AI disabled'}{log?.meta ? ` · ${log.meta.tokens} tokens` : ''}</p>
          </div>
          <div className="rounds">
            <small>{noSafePlan ? 'No legal candidates · 0 rounds' : `Round ${round || 1} of max 3`}</small>
            <div>{[1, 2, 3].map(i => <i key={i} className={i <= (round || 0) ? 'on' : ''} />)}</div>
          </div>
          <ol className="feed">
            {running && <li className="feed--code">Sending the flight to the agents…</li>}
            {feed.slice(-7).map((f, i) => <li key={feed.length - 7 + i} className={'feed--' + f.k}>{f.t}</li>)}
          </ol>
          {done && <p className="live-next">Next: how it decided <Icon name="arrow" /></p>}
        </aside>
      </div>
    </section>
  )
}
