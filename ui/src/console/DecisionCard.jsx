import { useState } from 'react'

// flash whatever the trace chip points at (a message or a rule)
function highlight(id) {
  const el = document.getElementById('msg-' + id) || document.getElementById('rule-' + id)
  if (!el) return
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  el.classList.add('flash')
  setTimeout(() => el.classList.remove('flash'), 1200)
}

export default function DecisionCard({ decision, onReplay }) {
  const [state, setState] = useState('pending') // pending | approved | override
  const [why, setWhy] = useState(false)

  if (!decision) return null
  const none = decision.status === 'no_safe_plan'

  const cls = 'panel decision' + (state === 'approved' ? ' decision--approved' : '') + (none ? ' decision--none' : '')
  const stamp = new Date().toTimeString().slice(0, 5)

  return (
    <div className={cls}>
      <div className="panel-title">
        <h3>{none ? 'No safe plan found' : 'Recommended plan'}</h3>
        <span className="who who--human">human decides</span>
      </div>
      <p className="summary">{decision.summary}</p>
      <div className="line">
        {!none && <span>Agreed in round {decision.agreed_in_round} · {decision.decided_by.replace('_', ' ')}</span>}
        {state === 'pending' && <span className="pill pill--pending">pending duty manager confirmation</span>}
        {state === 'approved' && <span className="pill pill--approved">approved {stamp}</span>}
        {state === 'override' && <span className="pill pill--override">overridden {stamp} · logged</span>}
      </div>
      <div className="btn-row">
        {state === 'pending' && !none && <button className="btn btn--human" onClick={() => setState('approved')}>Approve</button>}
        {state === 'pending' && <button className="btn btn--ghost" onClick={() => setState('override')}>Override</button>}
        <button className="btn btn--ghost" onClick={() => setWhy(w => !w)}>{why ? 'Hide why' : 'Why?'}</button>
        <button className="btn btn--ghost" onClick={onReplay}>Replay</button>
      </div>
      {why && decision.trace && (
        <div className="trace">
          {decision.trace.map(t => (
            <div className="trace-row" key={t.claim}>
              <span className="claim">{t.claim}</span>
              {t.links.map(l => <button key={l} className="link-chip" onClick={() => highlight(l)}>{l}</button>)}
            </div>
          ))}
          <p className="muted" style={{ fontSize: 12 }}>Click a chip to jump to the message or rule it came from.</p>
        </div>
      )}
    </div>
  )
}
