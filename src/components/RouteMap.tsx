import type { ReactNode } from 'react'
import { pointAtKm, RIVER_PATH, ROUTE_PATH, WAYPOINTS } from '../data/route'

export function RouteMap({
  children,
  labels = true,
  className = '',
}: {
  children?: ReactNode
  labels?: boolean
  className?: string
}) {
  const seen = new Set<string>()
  return (
    <svg className={`routemap ${className}`} viewBox="0 0 1000 700" role="img" aria-label="Mapa esquemático do percurso">
      <path d={RIVER_PATH} className="river" />
      <text x="60" y="300" className="river-label" transform="rotate(-78 60 300)">
        RIO GUADIANA
      </text>
      <path d={ROUTE_PATH} className="route-under" />
      <path d={ROUTE_PATH} className="route" />
      {WAYPOINTS.map((w) => {
        if (seen.has(w.name)) return null
        seen.add(w.name)
        const [x, y] = pointAtKm(w.km)
        return (
          <g key={w.km} className={`wpt ${w.kind}`} transform={`translate(${x} ${y})`}>
            {w.kind === 'start' ? (
              <rect x={-9} y={-9} width={18} height={18} />
            ) : w.kind === 'life' ? (
              <rect x={-7} y={-7} width={14} height={14} transform="rotate(45)" />
            ) : (
              <circle r={5} />
            )}
            {labels && (
              <text x={12} y={4}>
                {w.name}
                <tspan className="km"> {w.km.toFixed(0)}</tspan>
              </text>
            )}
          </g>
        )
      })}
      {children}
    </svg>
  )
}
