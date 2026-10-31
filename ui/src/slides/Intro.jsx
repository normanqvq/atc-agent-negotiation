export default function Intro() {
  return (
    <section className="slide">
      <div className="slide-inner">
        <p className="eyebrow">Autonomous SG 2026 · Airbus Challenge 2 · Team Concord, NUS</p>
        <h1>CONCORD</h1>
        <p className="tagline">Three desks. One safe plan.</p>
        <p className="lede">
          A late arrival at Atlanta in a thunderstorm. Today the tower, the cockpit and the ramp sort it out by phone
          while the aircraft holds and burns fuel. Concord gives each desk its own AI agent. They argue.
          A rulebook written in code stops anything unsafe. A human signs.
        </p>
        <div className="legend">
          <span className="l-llm">LLM agents · ATC, Pilot, Ground</span>
          <span className="l-code">Code · rules, chief, fallback</span>
          <span className="l-human">Human · duty manager approves</span>
        </div>
        <p className="muted">Press → to open the console. The judge picks the conditions; the flight is a real 2015 US DOT delay.</p>
      </div>
    </section>
  )
}
