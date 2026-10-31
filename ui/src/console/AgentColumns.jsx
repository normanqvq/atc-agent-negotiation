import Icon from '../Icon.jsx'

const ORDER = ['ATC', 'PILOT', 'GROUND']

// the negotiation board. desks across the top, rounds going down.
// each round = one row of three cells, then the chief's ruling once, across all three desks.
export default function AgentColumns({ log, revealed }) {
  let k = 0
  const rounds = log.rounds.map(r => ({
    round: r.round,
    messages: r.messages.map(m => ({ ...m, idx: k++ })),
  }))
  const total = k

  // who speaks next, so we can show a placeholder in their cell
  let next = null
  for (const r of rounds) for (const m of r.messages) if (m.idx === revealed) next = { agent: m.agent, round: r.round }
  if (revealed >= total) next = null

  return (
    <div className="board">
      <div className="board-head">
        {ORDER.map(a => {
          const active = next && next.agent === a
          return (
            <div className={'desk-head' + (active ? ' desk-head--active' : '')} key={a}>
              <h3>{log.agents[a].label} {active && <span className="speaking">drafting…</span>}</h3>
              <p className="sees">Sees only: {log.agents[a].sees}</p>
            </div>
          )
        })}
      </div>

      {rounds.map(r => {
        const shown = r.messages.filter(m => m.idx < revealed)
        const nextHere = next && next.round === r.round
        if (shown.length === 0 && !nextHere) return null
        const chiefs = shown.filter(m => m.agent === 'CHIEF')
        return (
          <div className="round" key={r.round}>
            <div className="round-label">Round {r.round}</div>
            <div className="round-row">
              {ORDER.map(a => {
                const mine = shown.filter(m => m.agent === a)
                const pending = nextHere && next.agent === a
                if (mine.length === 0 && !pending) return <div className="cell" key={a} />
                return (
                  <div className="cell" key={a}>
                    {mine.map(m => <Message key={m.id} m={m} agentLabel={log.agents[a].label} />)}
                    {pending && <Pending />}
                  </div>
                )
              })}
            </div>
            {chiefs.map(m => <Chief key={m.id} m={m} />)}
            {nextHere && next.agent === 'CHIEF' && <div className="chief chief--pending">Chief is checking the replies against the rulebook…</div>}
          </div>
        )
      })}
    </div>
  )
}

function Message({ m, agentLabel }) {
  return (
    <div className={'msg' + (m.blocked_by ? ' msg--blocked' : '')} id={'msg-' + m.id}>
      <div className="msg-top">
        <span className="agent">{agentLabel}</span>
        <span className="act">{m.action}</span>
        {m.candidate ? <span className="ref">#{m.candidate}</span> : null}
      </div>
      <p>{m.text}</p>
      {m.blocked_by && (
        <div className="msg-block">
          <span className="sign sign--stop"><Icon name="x" />{m.blocked_by}</span>
          Blocked by the rulebook
        </div>
      )}
    </div>
  )
}

// placeholder while the next desk "thinks"
function Pending() {
  return (
    <div className="msg msg--pending" aria-label="drafting">
      <div className="skeleton" />
      <div className="skeleton skeleton--short" />
    </div>
  )
}

function Chief({ m }) {
  return (
    <div className="chief" id={'msg-' + m.id}>
      <span className="who">Chief · code</span>
      <p>{m.text}</p>
      {m.candidate ? <span className="ref">#{m.candidate}</span> : null}
    </div>
  )
}
