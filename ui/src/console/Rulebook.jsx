import rulesFile from '../../../data/rules.json'

// the rule table, shown inside the console when the judge asks "what rules?"
export default function Rulebook({ onClose }) {
  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Rulebook · all in code, none in a prompt</h3>
        <button className="btn btn--ghost btn--sm" onClick={onClose}>Close</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Id</th><th>Rule</th><th>Kind</th><th>Source</th><th>Simplification</th></tr></thead>
          <tbody>
            {rulesFile.rules.map(r => (
              <tr key={r.id}>
                <td>{r.kind === 'hard' ? <span className="sign sign--stop">{r.id}</span> : <span className="rid mono">{r.id}</span>}</td>
                <td><b>{r.name}</b><br />{r.rule}</td>
                <td>{r.kind === 'hard' ? 'Hard · veto' : 'Soft · cost'}</td>
                <td>{r.source}{r.assumed && <> <span className="tag tag--sim">assumed</span></>}</td>
                <td className="muted">{r.simplification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
