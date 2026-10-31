import ev from '../../../data/sample_eval.json'

// page 3: what we measured, against what, and one case where it fails
export default function Evidence() {
  const h = ev.headline
  const maxDelay = Math.max(...ev.baselines.map(b => b.avg_delay_min))
  const f = ev.failure_case

  return (
    <section className="slide">
      <div className="slide-inner">
        <div className="ev-head">
          <h2>What we tested, and where it fails</h2>
          <p>{ev.pool_note}.</p>
        </div>

        <div className="findings">
          <div className="finding">
            <b>{Math.round(h.consensus_rate * 100)}%</b>
            <p>of {ev.n_events} disruptions reached consensus within 3 rounds.</p>
          </div>
          <div className="finding">
            <b>{h.injected_violations_blocked}</b>
            <p>injected unsafe proposals blocked by the rule layer.</p>
          </div>
          <div className="finding">
            <b>{Math.abs(h.delay_vs_fcfs_min)} min</b>
            <p>{h.delay_vs_fcfs_min < 0 ? 'less' : 'more'} average delay than first come, first served.</p>
          </div>
        </div>

        <div className="ev-grid">
          <div className="ev-col">
            <div className="panel">
              <div className="panel-title"><h3>Measured in simulation</h3></div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr><th>Method</th><th className="num">Avg delay, min</th><th className="num">Missed conn.</th><th className="num">Overtime, min</th></tr>
                  </thead>
                  <tbody>
                    {ev.baselines.map(b => (
                      <tr key={b.name} className={b.name.startsWith('Concord') ? 'hl' : ''}>
                        <td>{b.name}</td>
                        <td className="num">
                          <span className="bar-cell">
                            <span className="bar" style={{ width: Math.round((b.avg_delay_min / maxDelay) * 72) + 'px' }} />
                            {b.avg_delay_min}
                          </span>
                        </td>
                        <td className="num">{b.missed_connections}</td>
                        <td className="num">{b.overtime_min}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="panel">
              <div className="panel-title"><h3>Estimated, not measured</h3></div>
              <div className="tbl-wrap">
                <table className="tbl">
                  <tbody>
                    {ev.estimated.map(e => (
                      <tr key={e.name}><td>{e.name}</td><td>{e.value} <span className="muted">({e.source})</span></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="panel fail" id={'row-' + f.row_id}>
            <div className="panel-title">
              <h3>Where it fails · row <span className="mono">{f.row_id}</span></h3>
              <span className="sign sign--stop">No safe plan</span>
            </div>
            <dl>
              <dt>What</dt><dd>{f.summary}</dd>
              <dt>Happened</dt><dd>{f.what_happened}</dd>
              <dt>Why</dt><dd>{f.why}</dd>
              <dt>Fix</dt><dd>{f.fix}</dd>
            </dl>
          </div>
        </div>

        <p className="closing">The AI can argue, but it can't break the rules.</p>
      </div>
    </section>
  )
}
