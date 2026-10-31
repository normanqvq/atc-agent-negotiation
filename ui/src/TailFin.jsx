// a small tail fin with the airline's real symbol, like flight tracker apps show.
// logos live in ui/public/tails (sources in SOURCES.md there). airlines without a
// symbol-only file get a plain fin in their livery colours. usage: <TailFin flight="DL1810" />

// the fin outline in a 32x32 box: swept leading edge, flat top, trailing edge down to the base
const FIN = '2,30 17,4 25,4 28,30'

// helpers for the colour blocks (they get clipped to the fin shape)
const band = (y1, y2, color) => ({ color, points: `0,${y1} 32,${y1} 32,${y2} 0,${y2}` })

// logo = which file, and where it sits on the fin (x, y, w, h in the 32x32 box)
const DELTA = { name: 'Delta', base: '#0B1F4D', logo: ['/tails/delta.svg', 9.5, 10, 18, 16] }

const LIVERY = {
  DL: DELTA,
  // both flew into ATL as Delta Connection in 2015, in Delta colours
  EV: { ...DELTA, name: 'Atlantic Southeast · Delta Connection' },
  OO: { ...DELTA, name: 'SkyWest · Delta Connection' },
  WN: { name: 'Southwest', base: '#304CB2', logo: ['/tails/southwest-heart.svg', 9.5, 9.5, 18, 18] },
  US: { name: 'US Airways', base: '#0E2E62', logo: ['/tails/usairways-flag.svg', 12.5, 5.5, 14.5, 9.5] },
  // no symbol-only file on Wikimedia Commons for these two, so colour blocks
  AA: { name: 'American', base: '#36495A', blocks: [band(16, 20, '#C30019'), band(20, 24, '#FFFFFF'), band(24, 32, '#C30019')] },
  NK: { name: 'Spirit', base: '#FFE600', blocks: [band(26, 32, '#111111')] },
}

export default function TailFin({ flight, size = 28 }) {
  const code = String(flight || '').slice(0, 2)
  const livery = LIVERY[code] || { name: code, base: '#9AA4B2' }
  const clipId = 'fin-' + code // same airline = same shape, so sharing the id is fine
  const logo = livery.logo

  return (
    <svg className="tailfin" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={livery.name}>
      <title>{livery.name}</title>
      <clipPath id={clipId}><polygon points={FIN} /></clipPath>
      <g clipPath={`url(#${clipId})`}>
        <polygon points={FIN} fill={livery.base} />
        {(livery.blocks || []).map((b, i) => <polygon key={i} points={b.points} fill={b.color} />)}
        {logo && <image href={logo[0]} x={logo[1]} y={logo[2]} width={logo[3]} height={logo[4]} preserveAspectRatio="xMidYMid meet" />}
      </g>
      {/* thin outline so light liveries (Spirit yellow) still read on white */}
      <polygon points={FIN} fill="none" stroke="rgb(13 17 23 / .25)" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  )
}
