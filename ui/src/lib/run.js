import sampleLog from '../../../data/sample_log.json'

// POST /api/run. if the backend is not running, play the sample log instead so the demo still works
export async function runNegotiation(env, poolIndex) {
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool_index: poolIndex, environment: env }),
    })
    if (res.ok) return await res.json()
  } catch (e) {
    // backend not up
  }
  return sampleLog
}

// find what a trace link points at: a message or a rule check
export function lookup(log, id) {
  for (const r of log.rounds) for (const m of r.messages) if (m.id === id) return { kind: 'msg', round: r.round, m }
  const rule = log.rule_checks.find(c => c.id === id)
  if (rule) return { kind: 'rule', rule }
  return { kind: 'other', id }
}
