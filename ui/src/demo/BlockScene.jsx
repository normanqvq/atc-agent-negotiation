import ChiefBar from './ChiefBar.jsx'

// the hero moment: zoom in on one proposal the rulebook stopped, and why
export default function BlockScene({ log, msgId }) {
  let m = null
  let round = null
  for (const r of log.rounds) for (const x of r.messages) if (x.id === msgId) { m = x; round = r }
  if (!m) return null
  const rule = log.rule_checks.find(c => c.message_id === msgId) || log.rule_checks.find(c => c.id === m.blocked_by)
  const who = log.agents[m.agent] ? log.agents[m.agent].label : m.agent

  // the chief's answer shows here, under the last block of the round
  const blocksInRound = round.messages.filter(x => x.blocked_by)
  const isLastBlock = blocksInRound[blocksInRound.length - 1].id === msgId
  const chiefs = isLastBlock ? round.messages.filter(x => x.agent === 'CHIEF') : []

  return (
    <section className="scene">
      <div className="scene-head">
        <h2>Blocked. By code, not by an LLM.</h2>
        <p className="scene-sub">Safety rules are plain functions. No prompt can talk its way past them.</p>
      </div>
      <div className="block-grid">
        <div className="block-sign">
          <span className="sign sign--stop sign--xl">{m.blocked_by}</span>
          {rule && <p>{rule.name}</p>}
        </div>
        <dl className="facts">
          <dt>{who} asked</dt>
          <dd className="struck">{m.text}</dd>
          {rule && <><dt>Rule check</dt><dd>{rule.detail}</dd></>}
          {rule && <><dt>Source</dt><dd>{rule.source}</dd></>}
        </dl>
      </div>
      {chiefs.map(c => <ChiefBar key={c.id} m={c} delay={0.6} />)}
    </section>
  )
}
