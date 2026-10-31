import rulesFile from '../../../data/rules.json'

// the rule table, shown inside the console when the judge asks "what rules?"
export default function Rulebook({ onClose }) {
  return (
    <div className="panel">
      <div className="panel-title">
        <h3>Rulebook · all in code, none in a prompt</h3>
        <button className="btn btn--ghost" onClick={onClose}>Close</button>
      </div>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Id</th><th>Rule</th><th>Kind</th><th>Source</th><th>Simplification</th></tr></thead>
          <tbody>
            {rulesFile.rules.map(r => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td><b>{r.name}</b><br />{r.rule}</td>
                <td>{r.kind === 'hard' ? 'Hard · veto' : 'Soft · cost'}</td>
                <td>{r.source}{r.assumed && <span className="chip chip--sim" style={{ marginLeft: 6 }}>assumed</span>}</td>
                <td className="muted">{r.simplification}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
