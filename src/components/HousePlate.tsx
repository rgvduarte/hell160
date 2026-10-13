import type { Listing } from '../data/listings'

// Fachada alentejana desenhada: parede caiada, barra colorida, chaminé, porta e janelas.
// Serve de placeholder honesto até haver fotografias reais de cada casa.

const SKY: Record<Listing['tone'], string> = {
  cal: '#e7d9c1',
  ocre: '#d9b98a',
  terra: '#c98f6a',
  noite: '#1d1915',
}
const BAR: Record<Listing['tone'], string> = {
  cal: '#2f5d8a',
  ocre: '#c79a2e',
  terra: '#2f5d8a',
  noite: '#c79a2e',
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
        <circle cx={320} cy={70} r={22} fill="#efe9df" opacity="0.9" />
      ) : (
        <circle cx={320} cy={80} r={34} fill="#c8361b" opacity="0.9" />
      )}
      <rect x="0" y="262" width="400" height="38" fill={night ? '#2a241e' : '#b49a74'} />
      {/* chaminé alentejana */}
      <rect x={chimX} y={roof - 56} width={26} height={60} fill="#f6f1e8" />
      <rect x={chimX - 4} y={roof - 62} width={34} height={10} fill="#f6f1e8" />
      <rect x={chimX + 6} y={roof - 48} width={4} height={8} fill="#15120f" opacity="0.6" />
      <rect x={chimX + 16} y={roof - 48} width={4} height={8} fill="#15120f" opacity="0.6" />
      {/* parede */}
      <rect x={x0} y={roof} width={w} height={262 - roof} fill="#f6f1e8" />
      <rect x={x0 - 6} y={roof - 8} width={w + 12} height={10} fill="#a54a2a" />
      {/* barra */}
      <rect x={x0} y={236} width={w} height={26} fill={BAR[listing.tone]} />
      {/* porta */}
      <rect x={door} y={176} width={34} height={86} fill={night ? '#c8361b' : '#3a332c'} />
      <rect x={door - 4} y={172} width={42} height={6} fill={BAR[listing.tone]} />
      {/* janelas */}
      {Array.from({ length: windows }, (_, i) => {
        const wx = x0 + 18 + i * 62
        if (wx + 30 > door - 6 && wx < door + 40) return null
        if (wx + 30 > x0 + w - 10) return null
        return (
          <g key={i}>
            <rect x={wx - 4} y={168} width={38} height={46} fill={BAR[listing.tone]} />
            <rect x={wx} y={172} width={30} height={38} fill={night ? '#e8b04a' : '#3a332c'} />
          </g>
        )
      })}
      {night && <rect width="400" height="300" fill="#0f0d0b" opacity="0.35" />}
    </svg>
  )
}
