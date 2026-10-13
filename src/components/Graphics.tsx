import { useEffect, useId, useState } from 'react'
import { PROFILE, ROUTE_KM, WAYPOINTS } from '../data/route'

export function ElevationProfile({
  height = 180,
  marks = true,
  progressKm,
  marker = false,
}: {
  height?: number
  marks?: boolean
  progressKm?: number
  marker?: boolean
}) {
  const W = 1000
  const H = height
  const min = 80
  const max = 360
  const x = (km: number) => (km / ROUTE_KM) * W
  const y = (e: number) => H - 24 - ((e - min) / (max - min)) * (H - 44)
  const line = PROFILE.map((p, i) => `${i ? 'L' : 'M'}${x(p.km).toFixed(1)},${y(p.ele).toFixed(1)}`).join('')
  const area = `${line}L${W},${H - 24}L0,${H - 24}Z`
  const clipId = `done-${useId().replace(/:/g, '')}`

  return (
    <svg className="profile" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Perfil altimétrico esquemático do HELL160">
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={progressKm != null ? x(progressKm) : 0} height={H} />
        </clipPath>
      </defs>
      {[0, 40, 80, 120, 160].map((km) => (
        <g key={km}>
          <line x1={x(km)} x2={x(km)} y1={8} y2={H - 24} className="grid" />
          <text x={x(km) + 4} y={H - 8} className="tick">
            {km} km
          </text>
        </g>
      ))}
      <path d={area} className="area" />
      <path d={line} className="line" vectorEffect="non-scaling-stroke" />
      {progressKm != null && <path d={area} className="area-done" clipPath={`url(#${clipId})`} />}
      {marker && progressKm != null && (
        <line
          x1={x(progressKm)}
          x2={x(progressKm)}
          y1={8}
          y2={H - 24}
          className="marker"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {marks &&
        WAYPOINTS.slice(1, -1).map((w) => (
          <line
            key={w.km}
            x1={x(w.km)}
            x2={x(w.km)}
            y1={H - 24}
            y2={H - 34}
            className={w.kind === 'life' ? 'wp life' : 'wp'}
            vectorEffect="non-scaling-stroke"
          />
        ))}
    </svg>
  )
}

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function Countdown({ to }: { to: string }) {
  const now = useNow()
  const diff = Math.max(0, new Date(to).getTime() - now)
  const d = Math.floor(diff / 864e5)
  const h = Math.floor((diff % 864e5) / 36e5)
  const m = Math.floor((diff % 36e5) / 6e4)
  const s = Math.floor((diff % 6e4) / 1e3)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="countdown" aria-label={`Faltam ${d} dias`}>
      {[
        [d, 'dias'],
        [pad(h), 'h'],
        [pad(m), 'min'],
        [pad(s), 's'],
      ].map(([v, l]) => (
        <span key={l}>
          <b>{v}</b>
          <i>{l}</i>
        </span>
      ))}
    </div>
  )
}
