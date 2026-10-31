import { useEffect, useRef, useState } from 'react'
import Title from './slides/Title.jsx'
import Problem from './slides/Problem.jsx'
import HowItWorks from './slides/HowItWorks.jsx'
import Console from './console/Console.jsx'
import Evidence from './slides/Evidence.jsx'
import RulesSlide from './slides/RulesSlide.jsx'
import Closing from './slides/Closing.jsx'

// the deck is just a list of slide components, in order
const slides = [Title, Problem, HowItWorks, Console, Evidence, RulesSlide, Closing]

export default function App() {
  const deckRef = useRef(null)
  const [idx, setIdx] = useState(0)
  const [theme, setTheme] = useState('') // '' = follow system

  function goTo(i) {
    const deck = deckRef.current
    if (!deck) return
    const next = Math.max(0, Math.min(slides.length - 1, i))
    deck.children[next].scrollIntoView({ block: 'start', behavior: 'smooth' })
    setIdx(next)
  }

  // arrow keys flip slides, unless the judge is typing in a form control
  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement && document.activeElement.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(idx + 1) }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(idx - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx])

  // keep the counter right when the user scrolls by hand
  useEffect(() => {
    const deck = deckRef.current
    function onScroll() {
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
        {slides.map((Slide, i) => <Slide key={i} />)}
      </div>
      <div className="nav" aria-label="Slide navigation">
        <span className="num">{idx + 1} / {slides.length}</span>
        <button onClick={() => goTo(idx - 1)} aria-label="Previous slide">‹</button>
        <button onClick={() => goTo(idx + 1)} aria-label="Next slide">›</button>
        <button onClick={toggleTheme} aria-label="Toggle light or dark theme">◐</button>
      </div>
    </>
  )
}
