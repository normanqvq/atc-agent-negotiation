import ev from '../../../data/sample_eval.json'

export default function Evidence() {
  const h = ev.headline
  return (
    <section className="slide">
      <div className="slide-inner">
        <p className="eyebrow">Evidence · {ev.pool_note}</p>
        <h2>What we tested, and where it fails</h2>
        <div className="bignums">
          <div className="card">
            <span className="big num">{Math.round(h.consensus_rate * 100)}%</span>
            <p className="muted">reached consensus within 3 rounds</p>
          </div>
          <div className="card">
            <span className="big num">{h.injected_violations_blocked}</span>
            <p className="muted">injected unsafe proposals blocked by the rule layer</p>
          </div>
          <div className="card">
            <span className="big num">{Math.abs(h.delay_vs_fcfs_min)} min</span>
            <p className="muted">{h.delay_vs_fcfs_min < 0 ? 'less' : 'more'} average delay than first come, first served</p>
          </div>
        </div>
        <div className="two">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Measured in simulation</th><th className="num">Avg delay</th><th className="num">Missed conn.</th><th className="num">Overtime</th></tr>
              </thead>
              <tbody>
                {ev.baselines.map(b => (
                  <tr key={b.name} className={b.name.startsWith('Concord') ? 'hl' : ''}>
                    <td>{b.name}</td>
                    <td className="num">{b.avg_delay_min}</td>
                    <td className="num">{b.missed_connections}</td>
                    <td className="num">{b.overtime_min}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Estimated, not measured</th><th>Value</th></tr></thead>
              <tbody>
                {ev.estimated.map(e => (
                  <tr key={e.name}><td>{e.name}</td><td>{e.value} <span className="muted">({e.source})</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card fail">
          <h3>Failure case · row {ev.failure_case.row_id}</h3>
          <dl>
            <dt>What</dt><dd>{ev.failure_case.summary}</dd>
            <dt>Happened</dt><dd>{ev.failure_case.what_happened}</dd>
            <dt>Why</dt><dd>{ev.failure_case.why}</dd>
            <dt>Fix</dt><dd>{ev.failure_case.fix}</dd>
          </dl>
        </div>
        <p className="tagline">Concord. The AI can argue, but it can't break the rules.</p>
      </div>
    </section>
  )
}
