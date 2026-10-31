import ev from '../../../data/sample_eval.json'

// honest evaluation: one case where the system cannot find a plan, and what it does instead
export default function FailureScene() {
  const f = ev.failure_case
  return (
    <section className="scene">
      <div className="scene-head">
        <h2>Where it fails.</h2>
        <p className="scene-sub">From our evaluation run, row <span className="mono">{f.row_id}</span>.</p>
      </div>
      <div className="block-grid">
        <div className="block-sign">
          <span className="sign sign--stop sign--xl">No safe plan</span>
          <p>{f.summary}</p>
        </div>
        <dl className="facts">
          <dt>What happened</dt><dd>{f.what_happened}</dd>
          <dt>Why</dt><dd>{f.why}</dd>
          <dt>Fix next</dt><dd>{f.fix}</dd>
        </dl>
      </div>
    </section>
  )
}
