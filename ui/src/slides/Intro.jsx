import Icon from '../Icon.jsx'
import Aircraft3D from '../demo/Aircraft3D.jsx'

// page 1: the pitch. left = the claim, right = a 3D airliner holding over the runway
// (the live screen shows how the desks, rules and chief work, so no diagram here)
export default function Intro({ onNext }) {
  return (
    <section className="slide">
      <div className="slide-inner">
        <div className="intro-top">
          <span className="wordmark"><i />Concord</span>
          <span className="credit">Autonomous SG 2026 · Airbus Challenge 2 · Team Concord, NUS</span>
        </div>

        <div className="intro">
          <div className="intro-copy">
            <h1><span>Three desks.</span><span>One safe plan.</span></h1>
            <p className="lede">
              A late arrival at Atlanta in a thunderstorm. Today the tower, the cockpit and the ramp sort it out by phone
              while the aircraft holds and burns fuel. Concord gives each desk its own AI agent. They argue.
              A rulebook written in code stops anything unsafe. A human signs.
            </p>
            <div className="intro-cta">
              <button className="btn btn--lg" onClick={onNext}>Set the conditions <Icon name="arrow" /></button>
              <p>The judge picks the conditions. The flight is a real 2015 US DOT delay.</p>
            </div>
          </div>

          <Aircraft3D />
        </div>
      </div>
    </section>
  )
}
