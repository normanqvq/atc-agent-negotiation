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

// when the backend is not up, show the sample log but with the judge's choices stamped on it
function fakeLog(env, poolIndex) {
  const log = JSON.parse(JSON.stringify(sampleLog))
  for (const d of DIMENSIONS) {
    log.environment[d.key] = { value: env[d.key], label: labelFor(d.key, env[d.key]), options: d.options.map(o => o[0]) }
  }
  const f = pool.find(x => x.pool_index === poolIndex)
  if (f) {
    log.scenario = { ...log.scenario, ...f }
    log.arrival_queue = { ...log.arrival_queue, flights: f.arrival_queue }
  }
  log.meta = { ...log.meta, source: 'sample' }
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
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_index: poolIndex, environment: env }),
      })
      if (res.ok) result = await res.json()
    } catch (e) {
      // backend not running, fall through to the sample
    }
    if (!result) result = fakeLog(env, poolIndex)
    setLog(result)
    setRunKey(k => k + 1)
    setRunning(false)
  }

  // run once on load so the three desks are talking the moment the slide opens
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
              <span>{log.meta.model || 'claude-haiku-5-5'}</span>
              <span>{log.meta.elapsed_s}s · {log.meta.tokens} tokens</span>
              <span className={log.meta.source === 'sample' ? 'warn' : ''}>{log.meta.source === 'sample' ? 'REPLAY · backend offline' : 'LIVE'}</span>
            </div>
          )}
        </div>

        <ScenarioPicker
          env={env} onEnv={setEnv}
          pool={pool} poolIndex={poolIndex} onPoolIndex={setPoolIndex}
          onRun={run} running={running}
        />

        {showRules && <Rulebook onClose={() => setShowRules(false)} />}

        {log && <FlightStrip scenario={log.scenario} />}
        {log && (
          <QueueTimeline
            queue={{ ...log.arrival_queue, airport: log.scenario.destination }}
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
