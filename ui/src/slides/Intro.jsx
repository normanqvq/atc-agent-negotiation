import Icon from '../Icon.jsx'

// page 1: the pitch. left = the claim, right = the mechanism drawn like an apron:
// three desks argue above the hold-short line, code decides below it, a human signs.
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

          <div className="apron" aria-label="How Concord works">
            <div className="apron-desks">
              <div className="apron-desk">
                <b>Tower</b>
                <small>ATC agent · sees slots and wake</small>
                <span className="apron-say">Rank #3 first</span>
              </div>
              <div className="apron-desk">
                <b>Cockpit</b>
                <small>Pilot agent · sees fuel and connections</small>
                <span className="apron-say apron-say--x">Land 17:31</span>
              </div>
              <div className="apron-desk">
                <b>Ramp</b>
                <small>Ground agent · sees gates and crew</small>
                <span className="apron-say">Gate B14</span>
              </div>
            </div>

            <div className="apron-gate">
              <div className="holdshort" aria-hidden="true" />
              <div className="row">
                <span className="sign sign--stop">WAKE-01</span>
                <p>The rulebook is code, not a prompt. A proposal that breaks a rule never gets through.</p>
              </div>
            </div>

            <div className="apron-steps">
              <div className="apron-step">
                <span className="sign sign--code">Chief</span>
                <p>Code, not an LLM. Max 3 rounds, then it decides from the legal options.</p>
              </div>
              <div className="apron-step">
                <span className="sign sign--human">Duty manager</span>
                <p>Approves or overrides. Every claim links back to its source.</p>
              </div>
            </div>

            <div className="legend">
              <span className="l-llm">LLM agents</span>
              <span className="l-code">Code · rules, chief, fallback</span>
              <span className="l-human">Human</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
