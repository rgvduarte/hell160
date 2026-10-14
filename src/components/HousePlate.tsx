import type { Listing } from '../data/listings'

// Fachada alentejana desenhada: parede caiada, barra colorida, chaminé, porta e janelas.
// Serve de placeholder honesto até haver fotografias reais de cada casa.

const SKY: Record<Listing['tone'], string> = {
  cal: '#f2eee7',
  ocre: '#caba9f',
  terra: '#7a6a58',
  noite: '#15110e',
}
const BAR: Record<Listing['tone'], string> = {
  cal: '#f17307',
  ocre: '#4b3c31',
  terra: '#f8ab02',
  noite: '#f8ab02',
}

function hash(s: string) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}

export function HousePlate({ listing }: { listing: Listing }) {
  const h = hash(listing.id)
  const w = 220 + (h % 90)
  const x0 = (400 - w) / 2
  const roof = 120 + (h % 20)
  const door = x0 + 30 + ((h >> 3) % (w - 90))
  const chimX = x0 + 20 + ((h >> 5) % (w - 60))
  const windows = 1 + ((h >> 7) % 3)
  const night = listing.tone === 'noite'

  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <rect width="400" height="300" fill={SKY[listing.tone]} />
      {night ? (
        <circle cx={320} cy={70} r={22} fill="#f2eee7" opacity="0.9" />
      ) : (
        <circle cx={320} cy={80} r={34} fill="#e20613" opacity="0.9" />
      )}
      <rect x="0" y="262" width="400" height="38" fill={night ? '#241d18' : '#caba9f'} />
      {/* chaminé alentejana */}
      <rect x={chimX} y={roof - 56} width={26} height={60} fill="#faf8f4" />
      <rect x={chimX - 4} y={roof - 62} width={34} height={10} fill="#faf8f4" />
      <rect x={chimX + 6} y={roof - 48} width={4} height={8} fill="#1f1813" opacity="0.6" />
      <rect x={chimX + 16} y={roof - 48} width={4} height={8} fill="#1f1813" opacity="0.6" />
      {/* parede */}
      <rect x={x0} y={roof} width={w} height={262 - roof} fill="#faf8f4" />
      <rect x={x0 - 6} y={roof - 8} width={w + 12} height={10} fill="#e93d0d" />
      {/* barra */}
      <rect x={x0} y={236} width={w} height={26} fill={BAR[listing.tone]} />
      {/* porta */}
      <rect x={door} y={176} width={34} height={86} fill={night ? '#e20613' : '#4b3c31'} />
      <rect x={door - 4} y={172} width={42} height={6} fill={BAR[listing.tone]} />
      {/* janelas */}
      {Array.from({ length: windows }, (_, i) => {
        const wx = x0 + 18 + i * 62
        if (wx + 30 > door - 6 && wx < door + 40) return null
        if (wx + 30 > x0 + w - 10) return null
        return (
          <g key={i}>
            <rect x={wx - 4} y={168} width={38} height={46} fill={BAR[listing.tone]} />
            <rect x={wx} y={172} width={30} height={38} fill={night ? '#f8ab02' : '#4b3c31'} />
          </g>
        )
      })}
      {night && <rect width="400" height="300" fill="#0d0a08" opacity="0.35" />}
    </svg>
  )
}
