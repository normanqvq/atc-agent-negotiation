import rulesFile from '../../../data/rules.json'

export default function RulesSlide() {
  return (
    <section className="slide">
      <div className="slide-inner">
        <p className="eyebrow">The rulebook · all in code, none in a prompt</p>
        <h2>Four hard rules, one soft cost</h2>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Id</th><th>Rule</th><th>Kind</th><th>Source</th><th>Simplification we made</th></tr>
            </thead>
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
    </section>
  )
}
