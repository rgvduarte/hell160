import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Map as MLMap, StyleSpecification, LngLatBoundsLike } from 'maplibre-gl'

// Mapa base partilhado: OpenFreeMap Positron (gratuito, sem chave), nomes em português, estilo mínimo.
// Se as tiles falharem, usa um fundo de reserva servido pelo próprio site (contorno de Portugal e Espanha).
// O MapLibre só é carregado quando há um mapa na página.

const BASE = import.meta.env.BASE_URL
const POSITRON = 'https://tiles.openfreemap.org/styles/positron'
const SERPA: [number, number] = [-7.6, 37.95]

export type MapRoute = { id: string; url: string; color?: string; width?: number }
export type MapMarker = { lngLat: [number, number]; label: string; kind?: 'start' | 'aid' | 'life' | 'poi' }

const TONES = {
  land: '#f3f2f0',
  water: '#b9c9cf',
  line: '#c4c2be',
  ink: '#111111',
  ember: '#c8361b',
}

async function loadStyle(signal: AbortSignal): Promise<{ style: StyleSpecification | string; fallback: boolean }> {
  try {
    const res = await fetch(POSITRON, { signal })
    if (!res.ok) throw new Error(String(res.status))
    const style = (await res.json()) as StyleSpecification
    style.layers = style.layers
      .filter((l) => !/poi|housenumber|aerodrome|airport/.test(l.id))
      .map((l) => {
        if (l.type === 'symbol' && l.layout && 'text-field' in l.layout) {
          return { ...l, layout: { ...l.layout, 'text-field': ['coalesce', ['get', 'name:pt'], ['get', 'name']] } } as typeof l
        }
        if (l.type === 'fill' && /water/.test(l.id)) return { ...l, paint: { ...l.paint, 'fill-color': TONES.water } } as typeof l
        if (l.type === 'background') return { ...l, paint: { ...l.paint, 'background-color': TONES.land } } as typeof l
        return l
      })
    return { style, fallback: false }
  } catch {
    return {
      fallback: true,
      style: {
        version: 8,
        sources: { iberia: { type: 'geojson', data: `${BASE}geo/iberia.geojson` } },
        layers: [
          { id: 'sea', type: 'background', paint: { 'background-color': TONES.water } },
          { id: 'land', type: 'fill', source: 'iberia', paint: { 'fill-color': TONES.land } },
          { id: 'border', type: 'line', source: 'iberia', paint: { 'line-color': TONES.line, 'line-width': 1.2, 'line-dasharray': [3, 2] } },
        ],
      },
    }
  }
}

export function TrailMap({
  routes = [],
  markers = [],
  height = 520,
  center = SERPA,
  zoom = 9.2,
  label = 'Mapa do percurso',
  onMap,
  children,
}: {
  routes?: MapRoute[]
  markers?: MapMarker[]
  height?: number | string
  center?: [number, number]
  zoom?: number
  label?: string
  onMap?: (map: MLMap) => void
  children?: ReactNode
}) {
  const el = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'fallback' | 'error'>('loading')
  const [missing, setMissing] = useState<string[]>([])
  const [near, setNear] = useState(false)

  // O MapLibre (≈ 250 kB) só carrega quando o mapa está perto do ecrã.
  useEffect(() => {
    const node = el.current
    if (!node || near) return
    if (typeof IntersectionObserver === 'undefined') return setNear(true)
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setNear(true), { rootMargin: '600px 0px' })
    io.observe(node)
    return () => io.disconnect()
  }, [near])

  useEffect(() => {
    if (!el.current || !near) return
    const ctrl = new AbortController()
    let map: MLMap | null = null
    let cancelled = false
    const timer = window.setTimeout(() => ctrl.abort(), 6000)

    ;(async () => {
      const [{ default: maplibregl }, { style, fallback }] = await Promise.all([
        import('maplibre-gl'),
        loadStyle(ctrl.signal),
        import('maplibre-gl/dist/maplibre-gl.css'),
      ])
      window.clearTimeout(timer)
      if (cancelled || !el.current) return
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      map = new maplibregl.Map({
        container: el.current,
        style,
        center,
        // sem tiles só há contornos: abre mais afastado para se ver a fronteira e o contexto
        zoom: fallback ? Math.min(zoom, 7) : zoom,
        attributionControl: false,
        cooperativeGestures: true,
        dragRotate: false,
        pitchWithRotate: false,
        fadeDuration: reduced ? 0 : 300,
      })
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: fallback
            ? 'Natural Earth'
            : '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> · dados © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">colaboradores OpenStreetMap</a>',
        }),
      )
      map.on('error', () => {
        /* tiles em falta não devem partir a página */
      })

      map.on('load', async () => {
        if (!map || cancelled) return
        const bounds = new maplibregl.LngLatBounds()
        const notFound: string[] = []
        for (const r of routes) {
          try {
            const res = await fetch(r.url)
            if (!res.ok) throw new Error()
            const geo = await res.json()
            map.addSource(r.id, { type: 'geojson', data: geo })
            map.addLayer({ id: `${r.id}-casing`, type: 'line', source: r.id, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#fff', 'line-width': (r.width ?? 3) + 3 } })
            map.addLayer({ id: r.id, type: 'line', source: r.id, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': r.color ?? TONES.ember, 'line-width': r.width ?? 3 } })
            for (const f of geo.features ?? [geo]) {
              const g = f.geometry ?? f
              const lines = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : []
              for (const line of lines) for (const c of line) bounds.extend([c[0], c[1]])
            }
          } catch {
            notFound.push(r.id)
          }
        }
        for (const m of markers) {
          const node = document.createElement('div')
          node.className = `map-marker ${m.kind ?? 'poi'}`
          node.innerHTML = `<i></i><span>${m.label.replace(/</g, '&lt;')}</span>`
          new maplibregl.Marker({ element: node, anchor: 'left' }).setLngLat(m.lngLat).addTo(map)
          bounds.extend(m.lngLat)
        }
        if (!bounds.isEmpty()) map.fitBounds(bounds as unknown as LngLatBoundsLike, { padding: 48, duration: 0, maxZoom: fallback ? 9 : 12 })
        setMissing(notFound)
        setState(fallback ? 'fallback' : 'ready')
        onMap?.(map)
      })
    })().catch(() => !cancelled && setState('error'))

    return () => {
      cancelled = true
      ctrl.abort()
      window.clearTimeout(timer)
      map?.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [near, JSON.stringify(routes), JSON.stringify(markers)])

  return (
    <div className="trailmap" style={{ height }} role="region" aria-label={label}>
      <div ref={el} className="trailmap-canvas" />
      {state === 'loading' && <p className="trailmap-note mono">A carregar o mapa…</p>}
      {state === 'error' && <p className="trailmap-note mono">Não foi possível mostrar o mapa.</p>}
      {state !== 'loading' && routes.length > 0 && missing.length === routes.length && (
        <p className="trailmap-note mono">Traçado oficial publicado em breve</p>
      )}
      {children}
    </div>
  )
}
