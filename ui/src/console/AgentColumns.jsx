const ORDER = ['ATC', 'PILOT', 'GROUND']

// three desks side by side. each desk gets its own tall column and the chief's
// ruling spans all three at the end of each round.
export default function AgentColumns({ log, revealed }) {
  let k = 0
  const rounds = log.rounds.map(r => ({
    round: r.round,
    messages: r.messages.map(m => ({ ...m, idx: k++ })),
  }))
  const total = k

  // which agent is "speaking" next, to show a typing dot in that desk
  let nextAgent = null
  for (const r of rounds) for (const m of r.messages) if (m.idx === revealed) nextAgent = m.agent

  return (
    <div className="desks">
      {ORDER.map(a => {
        const items = []
        for (const r of rounds) {
          for (const m of r.messages) {
            if (m.agent !== a || m.idx >= revealed) continue
            items.push(<Message key={m.id} m={m} round={r.round} />)
          }
          // chief ruling for this round, repeated in each desk so every desk "receives" it
          const chief = r.messages.find(m => m.agent === 'CHIEF' && m.idx < revealed)
          if (chief) items.push(<Chief key={chief.id + a} m={chief} round={r.round} first={a === 'ATC'} />)
        }
        return (
          <div className={'desk' + (nextAgent === a ? ' desk--active' : '')} key={a}>
            <div className="desk-head">
              <h3>{log.agents[a].label}</h3>
              <p className="sees"><b>sees only:</b> {log.agents[a].sees}</p>
            </div>
            <div className="desk-body">
              {items}
              {nextAgent === a && revealed < total && <div className="typing" aria-label="thinking"><i /><i /><i /></div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Message({ m, round }) {
  return (
    <div className={'msg' + (m.blocked_by ? ' msg--blocked' : '')} id={'msg-' + m.id}>
      <span className="tag">R{round} · {m.action} {m.candidate ? <b>#{m.candidate}</b> : null}</span>
      <p>{m.text}</p>
      {m.blocked_by && <span className="block">✗ BLOCKED · {m.blocked_by}</span>}
    </div>
  )
}

function Chief({ m, round, first }) {
  // only the first copy carries the DOM id, so trace links land somewhere
  return (
    <div className="chief" id={first ? 'msg-' + m.id : undefined}>
      <span className="tag">R{round} · Chief</span>
      <p>{m.text}{m.candidate ? <b className="mono"> #{m.candidate}</b> : null}</p>
    </div>
  )
}
