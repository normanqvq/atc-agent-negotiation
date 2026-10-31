import './weather.css'

// the judge's weather, drawn behind every screen of the live run.
// thunderstorm = rain + lightning, fog = drifting fog, clear = a bit of sun
export default function Weather({ weather }) {
  if (weather === 'thunderstorm') {
    return (
      <div className="wx wx--storm" aria-hidden="true">
        <div className="rain rain--far" />
        <div className="rain rain--near" />
        <div className="flash" />
        <svg className="bolt" viewBox="0 0 60 160">
          <path d="M34 0 L8 74 L28 74 L14 160 L52 58 L31 58 L46 0 Z" />
        </svg>
      </div>
    )
  }
  if (weather === 'fog') {
    return (
      <div className="wx wx--fog" aria-hidden="true">
        <div className="fog fog--a" />
        <div className="fog fog--b" />
      </div>
    )
  }
  return (
    <div className="wx wx--clear" aria-hidden="true">
      <div className="sun" />
    </div>
  )
}
