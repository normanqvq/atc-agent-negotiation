import Icon from '../Icon.jsx'

const HOW = {
  consensus: 'all three desks agreed',
  chief_decided: 'the Chief decided after round 3',
  fallback: 'deterministic fallback, no AI',
}

// the result, as big as it gets. a human signs it.
// signed = { state: 'pending' | 'approved' | 'override', stamp: '17:52' }, kept in App so it survives page flips
export default function PlanScene({ log, signed, onSign }) {
  const d = log.decision
  const none = d.status === 'no_safe_plan'
  const how = HOW[d.decided_by] || String(d.decided_by || '').replace('_', ' ')

  return (
    <section className="scene scene--plan">
      <div className="plan-top">
        {none
          ? <span className="sign sign--stop sign--lg">No safe plan</span>
          : <span className="sign sign--code sign--lg">Recommended plan</span>}
        <span className="plan-how">{none ? 'Handed to the duty manager' : `Round ${d.agreed_in_round} · ${how}`}</span>
      </div>

      <p className="plan-summary">{d.summary}</p>

      <div className="plan-sign">
        {signed.state === 'pending' && (
          <>
            {!none && <button className="btn btn--human btn--lg" onClick={() => onSign('approved')}><Icon name="check" />Approve</button>}
            <button className="btn btn--ghost btn--lg" onClick={() => onSign('override')}>Override</button>
            <span className="plan-wait">Nothing happens until the duty manager signs.</span>
          </>
        )}
        {signed.state === 'approved' && <span className="stamp stamp--approved stamp--lg"><Icon name="check" />Approved by duty manager {signed.stamp}</span>}
        {signed.state === 'override' && <span className="stamp stamp--override stamp--lg">Overridden {signed.stamp} · logged</span>}
      </div>
    </section>
  )
}
