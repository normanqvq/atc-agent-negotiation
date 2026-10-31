import { useEffect, useRef, useState } from 'react'
import Intro from './slides/Intro.jsx'
import Console from './console/Console.jsx'
import Evidence from './slides/Evidence.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// three pages: the pitch, the live console, the evidence
const slides = [Intro, Console, Evidence]

export default function App() {
  const deckRef = useRef(null)
  const targetRef = useRef(null) // slide we are smooth-scrolling to, if any
  const [idx, setIdx] = useState(0)
  const [theme, setTheme] = useState('') // '' = follow system

  function goTo(i) {
    const deck = deckRef.current
    if (!deck) return
    const next = Math.max(0, Math.min(slides.length - 1, i))
    targetRef.current = next
    deck.children[next].scrollIntoView({ block: 'start', behavior: 'smooth' })
    setIdx(next)
  }

  // arrow keys flip pages, unless the judge is using a form control
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement && document.activeElement.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); goTo(idx + 1) }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(idx - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

  // keep the counter right when the user scrolls by hand
  useEffect(() => {
    const deck = deckRef.current
    function onScroll() {
      // still gliding towards a target? leave idx alone until we get there
      const t = targetRef.current
      if (t !== null) {
        if (Math.abs(deck.scrollTop - deck.children[t].offsetTop) > 4) return
        targetRef.current = null
      }
      let cur = 0
      for (let i = 0; i < deck.children.length; i++) {
        if (deck.children[i].offsetTop <= deck.scrollTop + 40) cur = i
      }
      setIdx(cur)
    }
    deck.addEventListener('scroll', onScroll, { passive: true })
    return () => deck.removeEventListener('scroll', onScroll)
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

  return (
    <>
      <div className="deck" ref={deckRef}>
        {slides.map((Slide, i) => <ErrorBoundary key={i}><Slide /></ErrorBoundary>)}
      </div>
      <div className="nav" aria-label="Page navigation">
        <span className="num">{idx + 1} / {slides.length}</span>
        <button onClick={() => goTo(idx - 1)} aria-label="Previous page">‹</button>
        <button onClick={() => goTo(idx + 1)} aria-label="Next page">›</button>
        <button onClick={toggleTheme} aria-label="Toggle light or dark theme">◐</button>
      </div>
    </>
  )
}
