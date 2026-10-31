// shown while POST /api/run is working (a few seconds with the real backend)
export default function WaitingScene() {
  return (
    <section className="scene scene--wait">
      <h2>Negotiating…</h2>
      <ol className="wait-steps">
        <li>Code builds candidate slots from the real arrival queue</li>
        <li>Tower, Cockpit and Ramp agents answer in parallel</li>
        <li>Every proposal goes through the rulebook</li>
      </ol>
    </section>
  )
}
