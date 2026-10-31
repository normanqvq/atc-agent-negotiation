const ORDER = ['ATC', 'PILOT', 'GROUND']

// one grid row per round: three agent cells, then the chief bar spanning the row
export default function AgentColumns({ log, revealed }) {
  // flatten so message k is revealed when k < revealed
  let k = 0
  const rounds = log.rounds.map(r => ({
    round: r.round,
    messages: r.messages.map(m => ({ ...m, idx: k++ })),
  }))

  return (
    <div className="agents">
      {ORDER.map(a => (
        <div className="agent-head" key={a}>
          <h3>{log.agents[a].label}</h3>
          <p className="sees"><b>sees only:</b> {log.agents[a].sees}</p>
        </div>
      ))}
      {rounds.map(r => {
        const shown = r.messages.filter(m => m.idx < revealed)
        if (shown.length === 0) return null
        const chief = shown.filter(m => m.agent === 'CHIEF')
        return [
          ...ORDER.map(a => (
            <div className="cell" key={r.round + a}>
              {shown.filter(m => m.agent === a).map(m => <Message key={m.id} m={m} round={r.round} />)}
            </div>
          )),
          ...chief.map(m => (
            <div className="chief" key={m.id} id={'msg-' + m.id}>
              <span className="tag">Round {r.round} · Chief · code</span>
              <p>{m.text}{m.candidate ? <b className="mono"> #{m.candidate}</b> : null}</p>
            </div>
          )),
        ]
      })}
      {revealed < rounds.reduce((s, r) => s + r.messages.length, 0) && (
        <div className="waiting">negotiating…</div>
      )}
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
