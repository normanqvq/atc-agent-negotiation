import { useLayoutEffect, useState } from 'react'

// reveal the negotiation one message at a time, like it is happening live.
// runKey changes -> start over (used by the Replay button).
// useLayoutEffect so a new log never paints one frame with the old count.
export default function useReveal(log, runKey, stepMs = 700) {
  const [n, setN] = useState(0)
  const total = log ? log.rounds.reduce((sum, r) => sum + r.messages.length, 0) : 0

  useLayoutEffect(() => {
    setN(0)
    if (!log) return
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setN(i)
      if (i >= total) clearInterval(timer)
    }, stepMs)
    return () => clearInterval(timer)
  }, [log, runKey])

  return { n, total, done: log ? n >= total : false }
}
