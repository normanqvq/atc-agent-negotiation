// blocked checks show up the moment their message is revealed, passes show at the end
export default function RuleChecks({ checks, revealedIds, done }) {
  const visible = checks.filter(c => done || (c.message_id && revealedIds.has(c.message_id)))
  return (
    <div className="panel">
      <div className="panel-title"><h3>Rule checks</h3><span className="who who--code">code, not LLM</span></div>
      <div className="rules">
        {visible.length === 0 && <p className="rule-empty">Every proposal passes through here before the next desk sees it.</p>}
        {visible.map(c => (
          <div key={c.id + (c.message_id || '')} className={'rule rule--' + c.status} id={'rule-' + c.id}>
            <span className="mark">{c.status === 'blocked' ? '✗' : '✓'}</span>
            <div>
              <span className="rid">{c.id}</span> <span className="rname">{c.name}</span>
              <p className="detail">{c.detail}</p>
              <span className="src">source: {c.source}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
