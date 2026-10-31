// the chief's ruling: a black/yellow airfield location sign across the screen. chief = code, not an LLM
export default function ChiefBar({ m, delay = 0 }) {
  return (
    <div className="chief chief--big" style={{ animationDelay: delay + 's' }}>
      <span className="who">Chief · code</span>
      <p>{m.text}</p>
      {m.candidate ? <span className="ref">#{m.candidate}</span> : null}
    </div>
  )
}
