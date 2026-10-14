// Traçados oficiais (GPX convertidos com scripts/gpx-to-geojson.mjs para public/routes/).
// Só aparecem com ROUTE_PUBLISHED[<ficheiro>] = true (src/data/site.ts) e se os ficheiros carregarem.
// Até lá, o site mostra o esquema ou "Traçado oficial publicado em breve", nunca um traçado inventado.

import { useEffect, useState } from 'react'
import type { MapRoute } from '../components/TrailMap'
import { ROUTE_PUBLISHED } from './site'

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
  return f ? { id: `route-${f}`, url: `${BASE}routes/${f}.geojson`, profileUrl: `${BASE}routes/${f}.profile.json`, color } : null
}

export const isRoutePublished = (raceId: string) => {
  const f = ROUTE_FILES[raceId]
  return !!f && ROUTE_PUBLISHED[f] === true
}

// Pontos públicos do GPX: PA (abastecimento), BV (base de vida), Água e Ponto de controlo.
export type RouteWaypointKind = 'aid' | 'life' | 'water' | 'control'
export type RouteWaypoint = { name: string; kind?: RouteWaypointKind; lat: number; lon: number; km: number }

export type RouteProfile = {
  id: string
  distanceKm: number
  gainM: number | null
  start: [number, number]
  profile: [number, number | null][]
  waypoints: RouteWaypoint[]
}

const isProfile = (d: unknown): d is RouteProfile => {
  const p = d as RouteProfile | null
  return !!p && typeof p.distanceKm === 'number' && Array.isArray(p.profile) && p.profile.length > 1 && Array.isArray(p.waypoints)
}

const hasLine = (geo: unknown): boolean => {
  const g = geo as { type?: string; features?: unknown[]; geometry?: unknown; coordinates?: unknown[] } | null
  if (!g) return false
  if (g.type === 'FeatureCollection') return (g.features ?? []).some(hasLine)
  if (g.type === 'Feature') return hasLine(g.geometry)
  if (g.type === 'LineString') return (g.coordinates?.length ?? 0) > 1
  if (g.type === 'MultiLineString') return (g.coordinates ?? []).some((l) => Array.isArray(l) && l.length > 1)
  return false
}

// O servidor de desenvolvimento responde index.html (200) a um ficheiro que não existe: só conta JSON válido.
const getJson = (url: string) =>
  fetch(url)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)

export type OfficialRoute =
  | { status: 'off' } // não publicado: o site mostra o que mostrava antes
  | { status: 'loading' }
  | { status: 'missing' } // publicado, mas o traçado não carregou
  | { status: 'ready'; route: MapRoute; profile: RouteProfile | null; gpxUrl: string }

const cache = new Map<string, Promise<OfficialRoute>>()

function loadOfficial(raceId: string): Promise<OfficialRoute> {
  const f = ROUTE_FILES[raceId]
  const route = mapRoute(raceId)!
  if (!cache.has(f)) {
    cache.set(
      f,
      Promise.all([getJson(route.url), getJson(route.profileUrl!)]).then(([geo, profile]) =>
        hasLine(geo)
          ? { status: 'ready' as const, route, profile: isProfile(profile) ? profile : null, gpxUrl: `${BASE}routes/${f}.gpx` }
          : { status: 'missing' as const },
      ),
    )
  }
  return cache.get(f)!
}

// Traçado oficial de uma prova (mapa, perfil e GPX). Não pede nada à rede se a prova não estiver publicada.
export function useOfficialRoute(raceId: string): OfficialRoute {
  const published = isRoutePublished(raceId)
  const [state, setState] = useState<{ id: string; value: OfficialRoute } | null>(null)
  useEffect(() => {
    if (!published) return
    let alive = true
    loadOfficial(raceId).then((value) => alive && setState({ id: raceId, value }))
    return () => {
      alive = false
    }
  }, [raceId, published])
  if (!published) return { status: 'off' }
  return state?.id === raceId ? state.value : { status: 'loading' }
}

// Perfil real (se existir o GPX convertido); null enquanto não houver.
export function useRouteProfile(raceId: string) {
  const [data, setData] = useState<RouteProfile | null>(null)
  useEffect(() => {
    const f = ROUTE_FILES[raceId]
    if (!f) return
    let alive = true
    getJson(`${BASE}routes/${f}.profile.json`).then((d) => alive && setData(isProfile(d) ? d : null))
    return () => {
      alive = false
    }
  }, [raceId])
  return data
}
