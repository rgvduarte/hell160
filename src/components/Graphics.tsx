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
          {/* a última marca fica perto da meta: em vez dela, a distância final encostada à direita */}
          {km < 160 && (
            <text x={x(km) + 4} y={H - 8} className="tick">
              {km} km
            </text>
          )}
        </g>
      ))}
      <text x={W - 4} y={H - 8} className="tick" textAnchor="end">
        {ROUTE_KM.toLocaleString('pt-PT')} km
      </text>
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

// Dias que faltam até uma data. Atualiza de hora a hora: no início não há segundos a correr ao lado do botão.
export function useDaysTo(iso: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 36e5)
    return () => window.clearInterval(id)
  }, [])
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 864e5))
}
