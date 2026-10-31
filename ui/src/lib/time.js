// "17:52" -> 1072 minutes since midnight, and back
export function toMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function fmt(min) {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}
