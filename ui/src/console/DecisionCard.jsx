import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon.jsx'

// flash whatever the trace chip points at (a message, a rule, or the data row)
function highlight(id) {
  const el = document.getElementById('msg-' + id) || document.getElementById('rule-' + id) || document.getElementById('row-' + id)
  if (!el) return
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  el.classList.add('flash')
  setTimeout(() => el.classList.remove('flash'), 1200)
}

export default function DecisionCard({ decision, onReplay }) {
  const [state, setState] = useState('pending') // pending | approved | override
  const [stamp, setStamp] = useState('')
  const [why, setWhy] = useState(false)
  const ref = useRef(null)

  // bring the card into view when it appears, it is the last thing on the page
  useEffect(() => { if (ref.current) ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [])

  if (!decision) return null
  const none = decision.status === 'no_safe_plan'
  const cls = 'panel decision'
    + (state === 'approved' ? ' decision--approved' : '')
    + (state === 'override' ? ' decision--override' : '')
    + (none ? ' decision--none' : '')

  function sign(next) {
    setState(next)
    setStamp(new Date().toTimeString().slice(0, 5))
  }

  return (
    <div className={cls} ref={ref} aria-live="polite">
      <div className="panel-title">
        <h3>{none ? 'No safe plan found' : 'Recommended plan'}</h3>
        {state === 'pending' && <span className="stamp stamp--pending">Awaiting duty manager</span>}
        {state === 'approved' && <span className="stamp stamp--approved">Approved {stamp}</span>}
        {state === 'override' && <span className="stamp stamp--override">Overridden {stamp} · logged</span>}
      </div>
      <p className="summary">{decision.summary}</p>
      {!none && (
        <div className="line">
          <span>Agreed in round {decision.agreed_in_round} · {String(decision.decided_by || '').replace('_', ' ')}</span>
        </div>
      )}
      <div className="btn-row">
        {state === 'pending' && !none && <button className="btn btn--human" onClick={() => sign('approved')}><Icon name="check" />Approve</button>}
        {state === 'pending' && <button className="btn btn--ghost" onClick={() => sign('override')}>Override</button>}
        <button className="btn btn--ghost" aria-expanded={why} onClick={() => setWhy(w => !w)}>{why ? 'Hide why' : 'Why this plan?'}</button>
        <button className="btn btn--ghost" onClick={onReplay}>Replay</button>
      </div>
      {why && decision.trace && (
        <div className="trace">
          {decision.trace.map((t, i) => (
            <div className="trace-row" key={i}>
              <span className="claim">{t.claim}</span>
              {t.links.map((l, j) => <button key={l + j} className="link-chip" onClick={() => highlight(l)}>{l}</button>)}
            </div>
          ))}
          <p className="hint">Click a reference to jump to the message, rule or data row it came from.</p>
        </div>
      )}
    </div>
  )
}
