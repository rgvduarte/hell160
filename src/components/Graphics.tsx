import { useEffect, useId, useMemo, useState } from 'react'
import { PROFILE, ROUTE_KM, WAYPOINTS } from '../data/route'

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

// Curvas de nível geradas (marching squares sobre um relevo sintético) — a textura da casa,
// no lugar de fotografias de banco de imagens. As linhas nunca se cruzam, como num mapa real.
export function Contours({
  seed = 7,
  levels = 14,
  className = '',
}: {
  seed?: number
  levels?: number
  className?: string
}) {
  const d = useMemo(() => {
    const r = rng(seed)
    const hills = Array.from({ length: 5 }, () => ({
      x: r() * 1200,
      y: r() * 700,
      s: 140 + r() * 260,
      a: (r() < 0.25 ? -0.6 : 1) * (0.5 + r()),
    }))
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28]
    const field = (x: number, y: number) => {
      let v = 0
      for (const h of hills) v += h.a * Math.exp(-((x - h.x) ** 2 + (y - h.y) ** 2) / (2 * h.s * h.s))
      v += 0.08 * Math.sin(x / 90 + ph[0]) * Math.cos(y / 70 + ph[1]) + 0.04 * Math.sin((x + y) / 37 + ph[2])
      return v
    }
    const step = 12
    const nx = Math.ceil(1200 / step) + 1
    const ny = Math.ceil(700 / step) + 1
    const g: number[] = []
    let lo = Infinity
    let hi = -Infinity
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const v = field(i * step, j * step)
        g.push(v)
        lo = Math.min(lo, v)
        hi = Math.max(hi, v)
      }
    let out = ''
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t
    for (let k = 1; k < levels; k++) {
      const iso = lo + ((hi - lo) * k) / levels
      for (let j = 0; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          const a = g[j * nx + i]
          const b = g[j * nx + i + 1]
          const c = g[(j + 1) * nx + i + 1]
          const e = g[(j + 1) * nx + i]
          const x = i * step
          const y = j * step
          const pts: [number, number][] = []
          if (a < iso !== b < iso) pts.push([lerp(x, x + step, (iso - a) / (b - a)), y])
          if (b < iso !== c < iso) pts.push([x + step, lerp(y, y + step, (iso - b) / (c - b))])
          if (e < iso !== c < iso) pts.push([lerp(x, x + step, (iso - e) / (c - e)), y + step])
          if (a < iso !== e < iso) pts.push([x, lerp(y, y + step, (iso - a) / (e - a))])
          for (let p = 0; p + 1 < pts.length; p += 2)
            out += `M${pts[p][0].toFixed(1)},${pts[p][1].toFixed(1)}L${pts[p + 1][0].toFixed(1)},${pts[p + 1][1].toFixed(1)}`
        }
    }
    return out
  }, [seed, levels])

  return (
    <svg className={`contours ${className}`} viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

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
