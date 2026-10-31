import { useEffect, useRef, useState } from 'react'
import sampleLog from '../../../data/sample_log.json'
import { DIMENSIONS, labelFor, envSummary } from '../lib/scenario.js'
import FlightStrip from './FlightStrip.jsx'
import QueueTimeline from './QueueTimeline.jsx'
import AgentColumns from './AgentColumns.jsx'
import RuleChecks from './RuleChecks.jsx'
import DecisionCard from './DecisionCard.jsx'
import Rulebook from './Rulebook.jsx'
import useReveal from './useReveal.js'

const TIMEOUT_MS = 25000

// does the backend's answer have everything the screen reads?
function looksLikeLog(x) {
  return x && Array.isArray(x.rounds) && Array.isArray(x.candidates) && Array.isArray(x.rule_checks)
    && x.agents && x.agents.ATC && x.agents.PILOT && x.agents.GROUND
    && x.scenario && x.arrival_queue && x.decision
}

// when the backend is not up: the sample negotiation, with only the judge's
// environment stamped on it. the flight stays the sample flight so the
// messages, candidates and timeline still agree with each other.
function fakeLog(env) {
  const log = JSON.parse(JSON.stringify(sampleLog))
  for (const d of DIMENSIONS) {
    log.environment[d.key] = { value: env[d.key], label: labelFor(d.key, env[d.key]), options: d.options.map(o => o[0]) }
  }
  log.meta = { ...(log.meta || {}), source: 'sample' }
  return log
}

// page 3: only the simulation. the judge's choices come from the setup page (App holds them).
// runId goes up each time "Run negotiation" is pressed there.
export default function Console({ env, poolIndex, runId, onRun, onSetup }) {
  const [ranWith, setRanWith] = useState('') // conditions of the run on screen, for the top bar
  const [log, setLog] = useState(null)
  const [running, setRunning] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [showRules, setShowRules] = useState(false)
  const { n, done } = useReveal(log, runKey)
  const mainRef = useRef(null)

  // the page never scrolls, the main column does: follow the newest message like a chat.
  // a new run or replay (n back to 0) jumps back to the top.
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    if (n === 0) el.scrollTo({ top: 0 })
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [n])

  async function run() {
    setRunning(true)
    setRanWith(envSummary(env))
    let result = null
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_index: poolIndex, environment: env }),
        signal: ctrl.signal,
      })
      if (res.ok) {
        const body = await res.json()
        if (looksLikeLog(body)) result = body
      }
    } catch (e) {
      // backend not running or too slow, fall through to the sample
    }
    clearTimeout(timer)
    if (!result) result = fakeLog(env)
    setLog(result)
    setRunKey(k => k + 1)
    setRunning(false)
  }

  // start a run whenever the setup page asks for one (not on page load)
  useEffect(() => { if (runId > 0) run() }, [runId])

  const revealedIds = new Set()
  const blockedIds = new Set()
  if (log) {
    let k = 0
    for (const r of log.rounds) for (const m of r.messages) {
      if (k < n) {
        revealedIds.add(m.id)
        if (m.blocked_by && m.candidate) blockedIds.add(m.candidate)
      }
      k++
    }
  }
  const meta = (log && log.meta) || {}

  // how many rounds have started so far, for the progress bar in the waiting card
  let roundsSeen = 0
  if (log) {
    let k = 0
    for (const r of log.rounds) { if (k < n) roundsSeen = r.round; k += r.messages.length }
  }

  return (
    <section className="slide slide--console">
      <div className="slide-inner">
        <h2 className="sr-only">Live negotiation console</h2>
        <div className="topbar">
          <span className="wordmark"><i />Concord</span>
          {(log || running) && <span className="ran-with">{ranWith}</span>}
          <div className="meta">
            {log && !running && (meta.source === 'sample'
              ? <span className="status status--replay"><i />Replay · backend offline, sample flight</span>
              : <span className="status"><i />Live · <span className="mono">{meta.model || 'claude-haiku-5-5'}</span>{meta.elapsed_s !== undefined && <span className="mono"> · {meta.elapsed_s}s</span>}</span>)}
            {log && !running && meta.ai_enabled === false && <span className="status status--off"><i />AI off · chief fallback</span>}
            <button className="btn btn--ghost btn--sm" aria-pressed={showRules} onClick={() => setShowRules(s => !s)}>
              {showRules ? 'Hide rulebook' : 'Rulebook'}
            </button>
            <button className="btn btn--ghost btn--sm" onClick={onSetup}>Change conditions</button>
          </div>
        </div>

        {showRules && <Rulebook onClose={() => setShowRules(false)} />}

        {!log && !running && (
          <div className="panel console-empty">
            <h3>Nothing is running yet</h3>
            <p>Set the weather, runways and the rest, pick a real delayed flight, then run the negotiation.</p>
            <div className="btn-row">
              <button className="btn" onClick={onSetup}>Set the conditions</button>
              <button className="btn btn--ghost" onClick={onRun}>Run with normal conditions</button>
            </div>
          </div>
        )}

        {(log || running) && (
          <div className="console-grid">
            <div className="console-main" ref={mainRef}>
              {log && !running && <FlightStrip scenario={log.scenario} />}
              {log && !running && (
                <QueueTimeline
                  queue={{ ...log.arrival_queue, airport: log.scenario.destination }}
                  subject={log.scenario}
                  candidates={log.candidates}
                  decision={done ? log.decision : null}
                  blockedIds={blockedIds}
                />
              )}
              {log && !running
                ? <AgentColumns log={log} revealed={n} />
                : <div className="panel"><p className="board-empty">Building candidates, running the rulebook, calling ATC · Pilot · Ground…</p></div>}
            </div>

            <aside className="console-rail" aria-label="Decision and rule checks">
              {log && done && !running
                ? <DecisionCard key={runKey} decision={log.decision} onReplay={() => setRunKey(k => k + 1)} />
                : (
                  <div className="panel decision-wait" aria-live="polite">
                    <div className="panel-title"><h3>Decision</h3><span className="note">a human signs</span></div>
                    <p>{running
                      ? 'Negotiating. The desks are getting their first look at the options.'
                      : `Round ${roundsSeen || 1} of max 3. The plan appears when all three desks agree, or the Chief decides after round 3.`}</p>
                    <div className="progress" aria-hidden="true">
                      {[1, 2, 3].map(i => <i key={i} className={!running && i <= roundsSeen ? 'on' : ''} />)}
                    </div>
                  </div>
                )}
              {log && !running && <RuleChecks checks={log.rule_checks} revealedIds={revealedIds} done={done} />}
            </aside>
          </div>
        )}
      </div>
    </section>
  )
}
