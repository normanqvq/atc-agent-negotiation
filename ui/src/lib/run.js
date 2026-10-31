import sampleLog from '../../../data/sample_log.json'

const TIMEOUT_MS = 25000

// does the backend's answer have everything the screens read?
function looksLikeLog(x) {
  return x && Array.isArray(x.rounds) && Array.isArray(x.candidates) && Array.isArray(x.rule_checks)
    && x.agents && x.scenario && x.arrival_queue && x.decision
}

// POST /api/run. if the backend is not running, too slow, or answers with an odd shape,
// play the sample log instead so the demo still works. meta.source = 'sample' marks that.
export async function runNegotiation(env, poolIndex) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool_index: poolIndex, environment: env }),
      signal: ctrl.signal,
    })
    if (res.ok) {
      const body = await res.json()
      if (looksLikeLog(body)) return body
    }
  } catch (e) {
    // backend not up or too slow
  } finally {
    clearTimeout(timer)
  }
  const copy = JSON.parse(JSON.stringify(sampleLog))
  copy.meta = { ...(copy.meta || {}), source: 'sample' }
  return copy
}

// find what a trace link points at: a message or a rule check
export function lookup(log, id) {
  for (const r of log.rounds) for (const m of r.messages) if (m.id === id) return { kind: 'msg', round: r.round, m }
  const rule = log.rule_checks.find(c => c.id === id)
  if (rule) return { kind: 'rule', rule }
  return { kind: 'other', id }
}
