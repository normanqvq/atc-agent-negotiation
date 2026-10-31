import { useEffect, useState } from 'react'
import Intro from './slides/Intro.jsx'
import Setup from './slides/Setup.jsx'
import LiveScene from './demo/LiveScene.jsx'
import SituationScene from './demo/SituationScene.jsx'
import RoundScene from './demo/RoundScene.jsx'
import BlockScene from './demo/BlockScene.jsx'
import PlanScene from './demo/PlanScene.jsx'
import TraceScene from './demo/TraceScene.jsx'
import FailureScene from './demo/FailureScene.jsx'
import EvidenceScene from './demo/EvidenceScene.jsx'
import CloseScene from './demo/CloseScene.jsx'
import Icon from './Icon.jsx'
import poolFile from '../../data/pool.json'
import { defaultEnvironment } from './lib/scenario.js'
import { runNegotiation } from './lib/run.js'

// the 3-minute story from docs/PLAN.md, one idea per screen. the presenter only presses →
const ACTS = ['Problem', 'Live run', 'Trust', 'Failure', 'Evidence']

// every screen in order. after Run: the live animation, then the explaining screens,
// one per round plus one for every proposal a rule blocked.
function buildSteps(log) {
  const steps = [{ id: 'intro', act: 0 }, { id: 'setup', act: 1 }, { id: 'live', act: 1 }]
  if (log) {
    steps.push({ id: 'situation', act: 1 })
    for (const r of log.rounds) {
      steps.push({ id: 'round', act: 1, round: r.round })
      for (const m of r.messages) if (m.blocked_by) steps.push({ id: 'block', act: 1, msgId: m.id })
    }
    steps.push({ id: 'plan', act: 1 })
    steps.push({ id: 'trace', act: 2 })
  }
  steps.push({ id: 'failure', act: 3 }, { id: 'evidence', act: 4 }, { id: 'close', act: 4 })
  return steps
}

// every screen is laid out on a fixed 16:9 stage, then scaled to fit the window
const STAGE_W = 1600
const STAGE_H = 900

export default function App() {
  const [idx, setIdx] = useState(0)
  const [scale, setScale] = useState(1)

  // the judge's choices, and the run they produced
  const [env, setEnv] = useState(defaultEnvironment())
  // start on flight #16: the one that produces a blocked proposal under thunderstorm + single runway
  const DEFAULT_FLIGHT = 16
  const [poolIndex, setPoolIndex] = useState(poolFile.flights.some(f => f.pool_index === DEFAULT_FLIGHT) ? DEFAULT_FLIGHT : poolFile.flights[0].pool_index)
  const [log, setLog] = useState(null)
  const [ranEnv, setRanEnv] = useState(env)
  const [signed, setSigned] = useState({ state: 'pending', stamp: '' })
  const [runStart, setRunStart] = useState(0) // for the timer on the live screen
  const [runMs, setRunMs] = useState(0)

  const steps = buildSteps(log)
  const step = steps[idx]

  async function startRun() {
    setLog(null)
    setSigned({ state: 'pending', stamp: '' })
    setRanEnv(env)
    setIdx(2) // the live screen
    const start = performance.now()
    setRunStart(start)
    const result = await runNegotiation(env, poolIndex)
    setRunMs(performance.now() - start)
    setLog(result)
  }

  function goTo(i) {
    setIdx(Math.max(0, Math.min(steps.length - 1, i)))
  }

  // → on the setup page runs the negotiation
  function next() {
    if (step.id === 'setup') startRun()
    else goTo(idx + 1)
  }

  function sign(state) {
    setSigned({ state, stamp: new Date().toTimeString().slice(0, 5) })
  }

  // → / PageDown next, ← / PageUp back (clickers send PageDown / PageUp)
  useEffect(() => {
    function onKey(e) {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return // flight list radios use arrows
      if (e.key === 'ArrowRight' || e.key === 'PageDown') next()
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(idx - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // scale the stage to the biggest 16:9 box that fits the window
  useEffect(() => {
    function fit() { setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)) }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  function renderStep() {
    switch (step.id) {
      case 'intro': return <Intro onNext={next} />
      case 'setup': return <Setup env={env} onEnv={setEnv} poolIndex={poolIndex} onPoolIndex={setPoolIndex} onRun={startRun} />
      case 'live': return <LiveScene log={log} flight={poolFile.flights.find(f => f.pool_index === poolIndex)} env={ranEnv} runStart={runStart} runMs={runMs} />
      case 'situation': return <SituationScene log={log} ranEnv={ranEnv} />
      case 'round': return <RoundScene log={log} round={step.round} />
      case 'block': return <BlockScene log={log} msgId={step.msgId} />
      case 'plan': return <PlanScene log={log} signed={signed} onSign={sign} />
      case 'trace': return <TraceScene log={log} />
      case 'failure': return <FailureScene />
      case 'evidence': return <EvidenceScene />
      default: return <CloseScene />
    }
  }

  return (
    <div className="viewport">
      <div className="stage" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {/* only the current screen is mounted, so its entrance animation plays every time */}
        <div className="page" key={idx + step.id}>{renderStep()}</div>

        <div className="bar">
          <ol className="acts">
            {ACTS.map((a, i) => <li key={a} className={i === step.act ? 'on' : ''}>{a}</li>)}
          </ol>
          <nav className="nav">
            <span className="num">{idx + 1} / {steps.length}</span>
            <button onClick={() => goTo(idx - 1)} disabled={idx === 0} aria-label="Previous"><Icon name="left" /></button>
            <button onClick={next} disabled={idx === steps.length - 1 || (step.id === 'live' && !log)} aria-label="Next"><Icon name="right" /></button>
          </nav>
        </div>
      </div>
    </div>
  )
}
