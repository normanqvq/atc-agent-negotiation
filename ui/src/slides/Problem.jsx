export default function Problem() {
  return (
    <section className="slide">
      <div className="slide-inner">
        <p className="eyebrow">The problem</p>
        <h2>5 p.m. at Atlanta. Thunderstorms. One flight is 45 minutes late.</h2>
        <p className="lede">
          Its gate is taken and the ramp crew's shift ends at seven. Today the tower, the airline's
          ops desk and ramp control sort this out by phone, one call at a time, while the aircraft
          holds and burns fuel.
        </p>
        <div className="cards">
          <div className="card">
            <h3>Tower</h3>
            <p className="muted">Sees the runway and the arrival queue. Not the fuel, not the gates.</p>
          </div>
          <div className="card">
            <h3>Cockpit</h3>
            <p className="muted">Sees fuel, crew duty time and 32 connecting passengers. Not the gate table.</p>
          </div>
          <div className="card">
            <h3>Ramp</h3>
            <p className="muted">Sees gates and the crew roster. Not the runway.</p>
          </div>
        </div>
        <div className="cards">
          <div className="card">
            <span className="big num">70%</span>
            <p className="muted">of air traffic delays are weather related (Airbus challenge brief).</p>
          </div>
          <div className="card">
            <span className="big num">~2.4 t/h</span>
            <p className="muted">fuel an A320 burns in a holding pattern (public burn-rate estimate).</p>
          </div>
          <div className="card">
            <span className="big num">10–15 min</span>
            <p className="muted">for one gate change to reach all three desks by phone (estimate, to verify with the Airbus mentor).</p>
          </div>
        </div>
        <p className="muted">User: the duty manager at a hub airport operations centre, handling one late arrival.</p>
      </div>
    </section>
  )
}
