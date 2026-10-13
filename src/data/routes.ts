// Traçados oficiais (GPX convertidos com scripts/gpx-to-geojson.mjs para public/routes/).
// Enquanto um ficheiro não existir, o mapa mostra "Traçado oficial publicado em breve" e nunca um traçado inventado.

import { useEffect, useState } from 'react'
import type { MapRoute } from '../components/TrailMap'

const BASE = import.meta.env.BASE_URL

export const ROUTE_FILES: Record<string, string> = {
  hell160: 'hell160',
  hell100: 'hell100',
  relay2: 'hell100',
  relay4: 'hell100',
  bike: 'bike',
}

export function mapRoute(raceId: string, color?: string): MapRoute | null {
  const f = ROUTE_FILES[raceId]
  return f ? { id: `route-${f}`, url: `${BASE}routes/${f}.geojson`, color } : null
}

export type RouteProfile = {
  id: string
  distanceKm: number
  gainM: number | null
  start: [number, number]
  profile: [number, number | null][]
  waypoints: { name: string; lat: number; lon: number; km: number }[]
}

// Perfil real (se existir o GPX convertido); null enquanto não houver.
export function useRouteProfile(raceId: string) {
  const [data, setData] = useState<RouteProfile | null>(null)
  useEffect(() => {
    const f = ROUTE_FILES[raceId]
    if (!f) return
    let alive = true
    fetch(`${BASE}routes/${f}.profile.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
    return () => {
      alive = false
    }
  }, [raceId])
  return data
}
