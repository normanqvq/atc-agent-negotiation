import ev from '../../../data/sample_eval.json'

// what we measured. three numbers, one comparison, estimates clearly marked
export default function EvidenceScene() {
  const h = ev.headline
  const maxDelay = Math.max(...ev.baselines.map(b => b.avg_delay_min))

  return (
    <section className="scene">
      <div className="scene-head">
        <h2>What we measured.</h2>
        <p className="scene-sub">{ev.pool_note}.</p>
      </div>

      <div className="findings findings--big">
        <div className="finding">
          <b>{Math.round(h.consensus_rate * 100)}%</b>
          <p>of {ev.n_events} disruptions reached consensus within 3 rounds</p>
        </div>
        <div className="finding">
          <b>{h.injected_violations_blocked}</b>
          <p>injected unsafe proposals blocked by the rule layer</p>
        </div>
        <div className="finding">
          <b>{Math.abs(h.delay_vs_fcfs_min)} min</b>
          <p>{h.delay_vs_fcfs_min < 0 ? 'less' : 'more'} average delay than first come, first served</p>
        </div>
      </div>

      <div className="compare">
        <div className="compare-row compare-row--head">
          <span>Measured in simulation</span><span>Average delay</span><span className="num">Missed conn.</span><span className="num">Overtime</span>
        </div>
        {ev.baselines.map(b => (
          <div key={b.name} className={'compare-row' + (b.name.startsWith('Concord') ? ' compare-row--us' : '')}>
            <span className="compare-name">{b.name}</span>
            <span className="compare-bar">
              <i style={{ width: (b.avg_delay_min / maxDelay) * 75 + '%' }} />
              <b className="mono">{b.avg_delay_min} min</b>
            </span>
            <span className="num mono">{b.missed_connections}</span>
            <span className="num mono">{b.overtime_min} min</span>
          </div>
        ))}
        <p className="compare-note">
          Estimated, not measured: {ev.estimated.map(e => `${e.name.toLowerCase()} ${e.value} (${e.source})`).join('; ')}.
        </p>
      </div>
    </section>
  )
}
