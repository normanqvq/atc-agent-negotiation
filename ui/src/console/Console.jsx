import { useEffect, useState } from 'react'
import sampleLog from '../../../data/sample_log.json'
import poolFile from '../../../data/pool.json'
import ScenarioPicker, { DIMENSIONS, defaultEnvironment, labelFor } from './ScenarioPicker.jsx'
import FlightStrip from './FlightStrip.jsx'
import QueueTimeline from './QueueTimeline.jsx'
import AgentColumns from './AgentColumns.jsx'
import RuleChecks from './RuleChecks.jsx'
import DecisionCard from './DecisionCard.jsx'
import Rulebook from './Rulebook.jsx'
import useReveal from './useReveal.js'

const pool = poolFile.flights
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

export default function Console() {
  const [env, setEnv] = useState(defaultEnvironment())
  const [poolIndex, setPoolIndex] = useState(pool[0] ? pool[0].pool_index : 1)
  const [log, setLog] = useState(null)
  const [running, setRunning] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [showRules, setShowRules] = useState(false)
  const { n, done } = useReveal(log, runKey)

  async function run() {
    setRunning(true)
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

  // run once on load so the three desks are talking the moment the page opens
  useEffect(() => { run() }, [])

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

  return (
    <section className="slide slide--wide slide--top slide--console">
      <div className="slide-inner">
        <div className="topbar">
          <span className="wordmark">CONCORD</span>
          <div className="legend">
            <span className="l-llm">LLM</span><span className="l-code">code</span><span className="l-human">human</span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowRules(s => !s)}>{showRules ? 'Hide rulebook' : 'Rulebook'}</button>
          {log && (
            <div className="meta">
              <span>{meta.model || 'claude-haiku-5-5'}</span>
              {meta.elapsed_s !== undefined && <span>{meta.elapsed_s}s · {meta.tokens} tokens</span>}
              {meta.ai_enabled === false && <span className="warn">AI OFF · chief fallback</span>}
              <span className={meta.source === 'sample' ? 'warn' : ''}>
                {meta.source === 'sample' ? 'REPLAY · backend offline · sample flight' : 'LIVE'}
              </span>
            </div>
          )}
        </div>

        <ScenarioPicker
          env={env} onEnv={setEnv}
          pool={pool} poolIndex={poolIndex} onPoolIndex={setPoolIndex}
          onRun={run} running={running}
        />

        {showRules && <Rulebook onClose={() => setShowRules(false)} />}

        {running && (
          <div className="panel running">
            <div className="typing"><i /><i /><i /></div>
            <p>Building candidates, running the rulebook, calling ATC · Pilot · Ground…</p>
          </div>
        )}

        {log && <FlightStrip scenario={log.scenario} />}
        {log && (
          <QueueTimeline
            queue={{ ...log.arrival_queue, airport: log.scenario.destination }}
            subject={log.scenario}
            candidates={log.candidates}
            decision={done ? log.decision : null}
            blockedIds={blockedIds}
          />
        )}

        {log && <AgentColumns log={log} revealed={n} />}

        {log && (
          <div className="bottom">
            <RuleChecks checks={log.rule_checks} revealedIds={revealedIds} done={done} />
            {done
              ? <DecisionCard key={runKey} decision={log.decision} onReplay={() => setRunKey(k => k + 1)} />
              : <div className="panel decision-wait"><p className="muted">Decision appears when the desks agree, or after round 3 the Chief decides.</p></div>}
          </div>
        )}
      </div>
    </section>
  )
}
