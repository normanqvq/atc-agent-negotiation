import Icon from '../Icon.jsx'

// blocked checks show up the moment their message is revealed, passes show at the end
export default function RuleChecks({ checks, revealedIds, done }) {
  const visible = (checks || []).filter(c => done || (c.message_id && revealedIds.has(c.message_id)))
  return (
    <div className="panel">
      <div className="panel-title"><h3>Rule checks</h3><span className="sign sign--code">Code, not LLM</span></div>
      <div className="rules" aria-live="polite">
        {visible.length === 0 && <p className="rule-empty">Every proposal is checked here before the next desk sees it. Blocks show up the moment they happen.</p>}
        {visible.map((c, i) => (
          <div key={c.id + '-' + i} className={'rule rule--' + c.status} id={i === 0 || !visible.slice(0, i).some(x => x.id === c.id) ? 'rule-' + c.id : undefined}>
            <span className="mark"><Icon name={c.status === 'blocked' ? 'x' : 'check'} label={c.status} /></span>
            <div className="rule-head">
              {c.status === 'blocked'
                ? <span className="sign sign--stop">{c.id}</span>
                : <span className="rid">{c.id}</span>}
              <span className="rname">{c.name}</span>
            </div>
            <p className="detail">{c.detail}</p>
            <span className="src">Source: {c.source}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
