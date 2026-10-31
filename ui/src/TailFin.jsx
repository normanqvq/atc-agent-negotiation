// a small tail fin in the airline's livery colours, like flight tracker apps show.
// simple colour blocks only, not the real logos. usage: <TailFin flight="DL1810" />

// the fin outline in a 32x32 box: swept leading edge, flat top, trailing edge down to the base
const FIN = '2,30 17,4 25,4 28,30'

// helpers for the colour blocks (they get clipped to the fin shape)
const band = (y1, y2, color) => ({ color, points: `0,${y1} 32,${y1} 32,${y2} 0,${y2}` })
const shape = (points, color) => ({ color, points })

// delta-style: navy with the red rear part. Atlantic Southeast (EV) flew as Delta Connection at ATL in 2015
const DELTA = { name: 'Delta', base: '#0B1F4D', blocks: [shape('14,0 32,0 32,32 25,32', '#C8102E')] }

const LIVERY = {
  DL: DELTA,
  EV: { ...DELTA, name: 'Atlantic Southeast · Delta Connection' },
  OO: { name: 'SkyWest', base: '#00205B', blocks: [shape('0,26 32,12 32,17 0,31', '#6CACE4')] },
  WN: { name: 'Southwest', base: '#304CB2', blocks: [band(21, 25, '#E31837'), band(25, 32, '#FFBF27')] },
  AA: { name: 'American', base: '#36495A', blocks: [band(16, 20, '#C30019'), band(20, 24, '#FFFFFF'), band(24, 32, '#C30019')] },
  US: { name: 'US Airways', base: '#1F3A70', blocks: [band(4, 8, '#C8102E'), band(8, 11, '#FFFFFF'), band(11, 14, '#C8102E')] },
  NK: { name: 'Spirit', base: '#FFE600', blocks: [band(26, 32, '#111111')] },
}

export default function TailFin({ flight, size = 28 }) {
  const code = String(flight || '').slice(0, 2)
  const livery = LIVERY[code] || { name: code, base: '#9AA4B2', blocks: [] }
  const clipId = 'fin-' + code // same airline = same shape, so sharing the id is fine

  return (
    <svg className="tailfin" width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={livery.name}>
      <title>{livery.name}</title>
      <clipPath id={clipId}><polygon points={FIN} /></clipPath>
      <g clipPath={`url(#${clipId})`}>
        <polygon points={FIN} fill={livery.base} />
        {livery.blocks.map((b, i) => <polygon key={i} points={b.points} fill={b.color} />)}
      </g>
      {/* thin outline so light liveries (Spirit yellow) still read on white */}
      <polygon points={FIN} fill="none" stroke="rgb(13 17 23 / .25)" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  )
}
