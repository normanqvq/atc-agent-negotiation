import { useEffect, useState } from 'react'
import Intro from './slides/Intro.jsx'
import Setup from './slides/Setup.jsx'
import Console from './console/Console.jsx'
import Evidence from './slides/Evidence.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import Icon from './Icon.jsx'
import poolFile from '../../data/pool.json'
import { defaultEnvironment } from './lib/scenario.js'

// four pages, shown one at a time like a PPT: the pitch, set the conditions, the live console, the evidence
const slides = [Intro, Setup, Console, Evidence]
const SETUP = 1
const CONSOLE = 2

// every page is laid out on a fixed 16:9 stage, then scaled to fit the screen.
// so it looks the same on a laptop and on the projector.
const STAGE_W = 1600
const STAGE_H = 900

export default function App() {
  const [idx, setIdx] = useState(0)
  const [theme, setTheme] = useState('') // '' = follow system
  const [scale, setScale] = useState(1)

  // the judge's choices live here so the setup page and the console share them
  const [env, setEnv] = useState(defaultEnvironment())
  const [poolIndex, setPoolIndex] = useState(poolFile.flights[0] ? poolFile.flights[0].pool_index : 1)
  const [runId, setRunId] = useState(0) // goes up by one each time "Run negotiation" is pressed

  function goTo(i) {
    setIdx(Math.max(0, Math.min(slides.length - 1, i)))
  }

  // arrow keys flip pages, unless the judge is using a form control
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement && document.activeElement.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (tag === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return // let the button click
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); goTo(idx + 1) }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(idx - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

  // scale the stage to the biggest 16:9 box that fits the window
  useEffect(() => {
    function fit() {
      setScale(Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme) root.setAttribute('data-theme', theme)
    else root.removeAttribute('data-theme')
  }, [theme])

  function toggleTheme() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const cur = theme || (dark ? 'dark' : 'light')
    setTheme(cur === 'dark' ? 'light' : 'dark')
  }

  function startRun() {
    setRunId(r => r + 1)
    goTo(CONSOLE)
  }

  const shared = {
    env, onEnv: setEnv,
    poolIndex, onPoolIndex: setPoolIndex,
    runId, onRun: startRun,
    onSetup: () => goTo(SETUP),
  }

  return (
    <div className="viewport">
      <div className="stage" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        {/* all pages stay mounted (so the console keeps its run), only the current one is visible */}
        {slides.map((Slide, i) => (
          <div key={i} className={'page' + (i === idx ? ' page--on' : '')}
            aria-hidden={i !== idx} inert={i !== idx ? '' : undefined}>
            <ErrorBoundary><Slide onNext={() => goTo(i + 1)} {...shared} /></ErrorBoundary>
          </div>
        ))}
        <nav className="nav" aria-label="Page navigation">
          <span className="num">{idx + 1} / {slides.length}</span>
          <button onClick={() => goTo(idx - 1)} disabled={idx === 0} aria-label="Previous page"><Icon name="left" /></button>
          <button onClick={() => goTo(idx + 1)} disabled={idx === slides.length - 1} aria-label="Next page"><Icon name="right" /></button>
          <button onClick={toggleTheme} aria-label="Toggle light or dark theme" title="Light / dark"><Icon name="theme" /></button>
        </nav>
      </div>
    </div>
  )
}
