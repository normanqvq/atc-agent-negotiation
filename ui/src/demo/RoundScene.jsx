import Icon from '../Icon.jsx'
import ChiefBar from './ChiefBar.jsx'

const ORDER = ['ATC', 'PILOT', 'GROUND']

// one round = three desks side by side, one big message each.
// if a rule blocked something this round, the chief's ruling waits for the next screen (BlockScene)
export default function RoundScene({ log, round }) {
  const r = log.rounds.find(x => x.round === round)
  if (!r) return null
  const hasBlock = r.messages.some(m => m.blocked_by)
  const chiefs = r.messages.filter(m => m.agent === 'CHIEF')

  return (
    <section className="scene">
      <div className="scene-head">
        <h2>Round {round}{round === 1 ? ': three desks answer' : ''}</h2>
        <p className="scene-sub">
          {round === 1
            ? 'Three separate agents, called in parallel. Each one sees only its own desk’s data.'
            : 'Max 3 rounds. If they still disagree, the Chief picks from the legal options.'}
        </p>
      </div>
      <div className="desks3">
        {ORDER.map((a, i) => {
          const mine = r.messages.filter(m => m.agent === a)
          return (
            <div className="desk3" style={{ animationDelay: (0.15 + i * 0.35) + 's' }} key={a}>
              <div className="desk3-head">
                <h3>{log.agents[a].label}</h3>
                <p>Sees only: {log.agents[a].sees}</p>
              </div>
              {mine.map(m => (
                <div className={'say' + (m.blocked_by ? ' say--blocked' : '')} key={m.id}>
                  <div className="say-act">
                    <span>{m.action}</span>
                    {m.candidate ? <span className="ref">#{m.candidate}</span> : null}
                  </div>
                  <p>{m.text}</p>
                  {m.blocked_by && <span className="sign sign--stop sign--lg"><Icon name="x" />{m.blocked_by}</span>}
                </div>
              ))}
              {mine.length === 0 && <p className="say-none">No message this round</p>}
            </div>
          )
        })}
      </div>
      {!hasBlock && chiefs.map(m => <ChiefBar key={m.id} m={m} delay={1.3} />)}
    </section>
  )
}
