export default function HowItWorks() {
  return (
    <section className="slide">
      <div className="slide-inner">
        <p className="eyebrow">How it works</p>
        <h2>Each desk gets its own agent. A rulebook in code sits between them. A human signs.</h2>
        <div className="legend">
          <span className="l-llm">LLM agents (claude-haiku-5-5)</span>
          <span className="l-code">Code: rules, chief, fallback</span>
          <span className="l-human">Human: duty manager</span>
        </div>
        <div className="flow">
          <div className="flow-box flow-box--code">
            <span className="who">code</span>
            <strong>Real disruption</strong>
            <small>One row from the 2015 US DOT delay data, plus the real arrival queue that day. Judge sets weather, runways, terminal.</small>
          </div>
          <div className="flow-box flow-box--code">
            <span className="who">code</span>
            <strong>Candidates × rules</strong>
            <small>Slots × gates × hold-or-slow-down. WAKE-01, CAP-01, FUEL-01, GATE-01 remove anything unsafe before an agent sees it.</small>
          </div>
          <div className="flow-box flow-box--llm">
            <span className="who">llm × 3</span>
            <strong>ATC · Pilot · Ground</strong>
            <small>Each sees only its own data. Can only reference candidate numbers. Fixed JSON output.</small>
          </div>
          <div className="flow-box flow-box--code">
            <span className="who">code</span>
            <strong>Chief</strong>
            <small>Scores counters, picks the compromise, ATC weighted highest. Max 3 rounds, then decides alone. Works with the AI off.</small>
          </div>
          <div className="flow-box flow-box--human">
            <span className="who">human</span>
            <strong>Duty manager</strong>
            <small>Approves or overrides. Every line of the plan links to a message, a rule or a data row.</small>
          </div>
        </div>
        <p className="muted">
          Hard constraints are vetoes with no priority. Priority only decides soft trade-offs: throughput, connections, gate convenience.
        </p>
      </div>
    </section>
  )
}
