import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Map as MLMap, StyleSpecification, LngLatBoundsLike, IControl, MapSourceDataEvent } from 'maplibre-gl'
import type { RouteWaypoint } from '../data/routes'
import '../styles/map.css'

// Mapa base partilhado: OpenFreeMap Positron (gratuito, sem chave), nomes em português, estilo mínimo.
// Se as tiles falharem, usa um fundo de reserva servido pelo próprio site (contorno de Portugal e Espanha).
// O MapLibre só é carregado quando há um mapa na página.
// Com `terrain3d`, aparece um botão para ver o relevo em 3D (AWS Terrain Tiles); o relevo só é pedido quando se carrega.

const BASE = import.meta.env.BASE_URL
const POSITRON = 'https://tiles.openfreemap.org/styles/positron'
const SERPA: [number, number] = [-7.6, 37.95]

// Relevo: modelo digital do terreno em PNG (codificação Terrarium), público e com CORS aberto.
const TERRARIUM = 'https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png'
const DEM_ATTRIBUTION =
  'Relevo: <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">Mapzen / AWS Terrain Tiles</a> (EU-DEM, Copernicus)'
// O Alentejo é plano: sem exagero, as colinas quase não se veem. O fator aparece no mapa.
const EXAGGERATION = 1.6
const PITCH_3D = 60
const BEARING_3D = -20
const DEM = 'relevo-dem'
const HILLSHADE_SRC = 'relevo-sombra'
const HILLSHADE = 'relevo-sombra'

export type MapRoute = { id: string; url: string; profileUrl?: string; color?: string; width?: number }
export type MapMarker = {
  lngLat: [number, number]
  label: string
  kind?: 'start' | 'aid' | 'life' | 'water' | 'control' | 'poi'
  // por omissão, só a partida e as bases de vida mostram o nome (o resto fica na tabela da página)
  showLabel?: boolean
}

// Textos dos controlos do mapa em português.
const LOCALE = {
  'Map.Title': 'Mapa',
  'Marker.Title': 'Ponto do percurso',
  'NavigationControl.ZoomIn': 'Aproximar',
  'NavigationControl.ZoomOut': 'Afastar',
  'NavigationControl.ResetBearing': 'Repor o norte',
  'NavigationControl.ResetBearingAndPitch': 'Repor o norte e a inclinação',
  'AttributionControl.ToggleAttribution': 'Mostrar atribuição',
  'AttributionControl.MapFeedback': 'Sugerir correções ao mapa',
  'FullscreenControl.Enter': 'Ecrã inteiro',
  'FullscreenControl.Exit': 'Sair do ecrã inteiro',
  'GeolocateControl.FindMyLocation': 'Mostrar a minha localização',
  'GeolocateControl.LocationNotAvailable': 'Localização indisponível',
  'ScaleControl.Meters': 'm',
  'ScaleControl.Kilometers': 'km',
  'CooperativeGesturesHandler.WindowsHelpText': 'Usa Ctrl + roda do rato para aproximar o mapa',
  'CooperativeGesturesHandler.MacHelpText': 'Usa ⌘ + roda do rato para aproximar o mapa',
  'CooperativeGesturesHandler.MobileHelpText': 'Usa dois dedos para mover o mapa',
}

const TONES = {
  land: '#f3f2f0',
  water: '#b9c9cf',
  line: '#c4c2be',
  ink: '#111111',
  ember: '#e20613',
}

const KIND_LABEL: Record<NonNullable<MapMarker['kind']>, string> = {
  start: 'Partida',
  aid: 'Abastecimento',
  life: 'Base de vida',
  water: 'Água',
  control: 'Ponto de controlo',
  poi: 'Ponto',
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

type Coord = number[]
function lineCoords(geo: unknown): Coord[][] {
  const g = geo as { type?: string; features?: unknown[]; geometry?: unknown; coordinates?: unknown }
  if (!g) return []
  if (g.type === 'FeatureCollection') return (g.features ?? []).flatMap(lineCoords)
  if (g.type === 'Feature') return lineCoords(g.geometry)
  if (g.type === 'LineString') return [g.coordinates as Coord[]]
  if (g.type === 'MultiLineString') return g.coordinates as Coord[][]
  return []
}

// Marcador em HTML. Os nomes vêm de ficheiros (GPX): entram sempre como texto, nunca como HTML.
function markerNode(m: MapMarker) {
  const kind = m.kind ?? 'poi'
  const node = document.createElement('div')
  node.className = `map-marker ${kind}`
  node.setAttribute('aria-label', kind === 'start' || m.label === KIND_LABEL[kind] ? m.label : `${KIND_LABEL[kind]}: ${m.label}`)
  node.setAttribute('role', 'img')
  node.appendChild(document.createElement('i'))
  if (m.showLabel ?? (kind === 'start' || kind === 'life')) {
    const span = document.createElement('span')
    span.textContent = m.label
    node.appendChild(span)
  }
  return node
}

const near = (a: Coord, b: Coord) => Math.abs(a[0] - b[0]) < 0.003 && Math.abs(a[1] - b[1]) < 0.003 // ~300 m

export function TrailMap({
  routes = [],
  markers = [],
  height = 520,
  center = SERPA,
  zoom = 9.2,
  label = 'Mapa do percurso',
  terrain3d = false,
  waypoints = false,
  onMap,
  children,
}: {
  routes?: MapRoute[]
  markers?: MapMarker[]
  height?: number | string
  center?: [number, number]
  zoom?: number
  label?: string
  // botão 2D / 3D (relevo exagerado). O relevo só é pedido quando alguém carrega em 3D.
  terrain3d?: boolean
  // pontos públicos do GPX (abastecimentos, bases de vida, água), lidos do profileUrl de cada percurso
  waypoints?: boolean
  onMap?: (map: MLMap) => void
  children?: ReactNode
}) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MLMap | null>(null)
  const libRef = useRef<typeof import('maplibre-gl') | null>(null)
  const boundsRef = useRef<LngLatBoundsLike | null>(null)
  const compassRef = useRef<IControl | null>(null)
  const demWatch = useRef<(() => void) | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'fallback' | 'error'>('loading')
  const [missing, setMissing] = useState<string[]>([])
  const [inView, setInView] = useState(false)
  const [view, setView] = useState<'2d' | '3d'>('2d')
  const [relief, setRelief] = useState<'idle' | 'loading' | 'ok' | 'failed'>('idle')

  // O MapLibre (≈ 250 kB) só carrega quando o mapa está perto do ecrã.
  useEffect(() => {
    const node = el.current
    if (!node || inView) return
    if (typeof IntersectionObserver === 'undefined') return setInView(true)
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setInView(true), { rootMargin: '600px 0px' })
    io.observe(node)
    return () => io.disconnect()
  }, [inView])

  useEffect(() => {
    if (!el.current || !inView) return
    const ctrl = new AbortController()
    let map: MLMap | null = null
    let cancelled = false
    const timer = window.setTimeout(() => ctrl.abort(), 6000)

    ;(async () => {
      const [maplibre, { style, fallback }] = await Promise.all([
        import('maplibre-gl'),
        loadStyle(ctrl.signal),
        import('maplibre-gl/dist/maplibre-gl.css'),
      ])
      const maplibregl = maplibre.default
      window.clearTimeout(timer)
      if (cancelled || !el.current) return
      libRef.current = maplibre
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      map = new maplibregl.Map({
        container: el.current,
        style,
        center,
        // sem tiles só há contornos: abre mais afastado para se ver a fronteira e o contexto
        zoom: fallback ? Math.min(zoom, 7) : zoom,
        attributionControl: false,
        cooperativeGestures: true,
        // em 2D o mapa não roda nem inclina; o modo 3D liga estes gestos
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        fadeDuration: reduced ? 0 : 300,
        locale: LOCALE,
      })
      map.touchZoomRotate.disableRotation()
      map.keyboard.disableRotation()
      mapRef.current = map
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
        const pins: MapMarker[] = []
        for (const r of routes) {
          try {
            const res = await fetch(r.url)
            if (!res.ok) throw new Error()
            const geo = await res.json()
            const lines = lineCoords(geo).filter((l) => l.length > 1)
            if (!lines.length) throw new Error()
            if (cancelled) return
            map.addSource(r.id, { type: 'geojson', data: geo })
            const w = r.width ?? 3
            map.addLayer({ id: `${r.id}-casing`, type: 'line', source: r.id, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#fff', 'line-width': w + 3 } })
            map.addLayer({ id: r.id, type: 'line', source: r.id, layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': r.color ?? TONES.ember, 'line-width': w } })
            for (const line of lines) for (const c of line) bounds.extend([c[0], c[1]])
            // partida e meta: o primeiro e o último ponto do traçado
            const a = lines[0][0]
            const b = lines[lines.length - 1].at(-1)!
            if (near(a, b)) pins.push({ lngLat: [a[0], a[1]], label: 'Partida e meta', kind: 'start' })
            else pins.push({ lngLat: [a[0], a[1]], label: 'Partida', kind: 'start' }, { lngLat: [b[0], b[1]], label: 'Meta', kind: 'start' })
            if (waypoints && r.profileUrl) {
              const prof = await fetch(r.profileUrl).then((x) => (x.ok ? x.json() : null)).catch(() => null)
              for (const p of (prof?.waypoints ?? []) as RouteWaypoint[]) {
                if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon) || typeof p.name !== 'string') continue
                pins.push({ lngLat: [p.lon, p.lat], label: p.name, kind: p.kind ?? 'aid' })
              }
            }
          } catch {
            notFound.push(r.id)
          }
        }
        if (cancelled || !map) return
        // bases de vida por cima dos abastecimentos; a partida por cima de tudo
        const order = ['water', 'control', 'aid', 'poi', 'life', 'start']
        for (const m of [...pins, ...markers].sort((x, y) => order.indexOf(x.kind ?? 'poi') - order.indexOf(y.kind ?? 'poi'))) {
          new maplibregl.Marker({ element: markerNode(m), anchor: 'left', opacityWhenCovered: '0.35' }).setLngLat(m.lngLat).addTo(map)
        }
        for (const m of markers) bounds.extend(m.lngLat)
        if (!bounds.isEmpty()) {
          boundsRef.current = bounds.toArray() as LngLatBoundsLike
          map.fitBounds(boundsRef.current, { padding: fitPadding(map), duration: 0, maxZoom: fallback ? 9 : 12 })
        }
        setMissing(notFound)
        setState(fallback ? 'fallback' : 'ready')
        onMap?.(map)
      })
    })().catch(() => !cancelled && setState('error'))

    return () => {
      cancelled = true
      ctrl.abort()
      window.clearTimeout(timer)
      demWatch.current?.()
      demWatch.current = null
      map?.remove()
      mapRef.current = null
      compassRef.current = null
      boundsRef.current = null
      setView('2d')
      setRelief('idle')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, JSON.stringify(routes), JSON.stringify(markers), waypoints])

  // ---------- 2D / 3D ----------
  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  function gestures3d(map: MLMap, on: boolean) {
    if (on) {
      map.dragRotate.enable()
      map.touchPitch.enable()
      map.touchZoomRotate.enableRotation()
      map.keyboard.enableRotation()
    } else {
      map.dragRotate.disable()
      map.touchPitch.disable()
      map.touchZoomRotate.disableRotation()
      map.keyboard.disableRotation()
    }
    // em 3D, bússola para repor o norte e a inclinação
    const lib = libRef.current
    if (on && !compassRef.current && lib) {
      compassRef.current = new lib.default.NavigationControl({ showZoom: false, showCompass: true, visualizePitch: true })
      map.addControl(compassRef.current, 'top-right')
    } else if (!on && compassRef.current) {
      map.removeControl(compassRef.current)
      compassRef.current = null
    }
  }

  function camera(map: MLMap, to3d: boolean) {
    const bounds = boundsRef.current
    const base = bounds ? map.cameraForBounds(bounds, { padding: fitPadding(map), bearing: to3d ? BEARING_3D : 0, maxZoom: 12 }) : undefined
    const opts = {
      ...(base ? { center: base.center, zoom: to3d ? (base.zoom ?? map.getZoom()) - 0.35 : base.zoom } : {}),
      pitch: to3d ? PITCH_3D : 0,
      bearing: to3d ? BEARING_3D : 0,
    }
    if (reducedMotion()) map.jumpTo(opts)
    else map.easeTo({ ...opts, duration: 900 })
  }

  function to2d(failed = false) {
    const map = mapRef.current
    demWatch.current?.()
    demWatch.current = null
    setView('2d')
    if (!map) return
    map.setTerrain(null)
    if (failed) {
      // sem relevo: retira as camadas e as fontes para uma nova tentativa as pedir de novo
      if (map.getLayer(HILLSHADE)) map.removeLayer(HILLSHADE)
      if (map.getSource(HILLSHADE_SRC)) map.removeSource(HILLSHADE_SRC)
      if (map.getSource(DEM)) map.removeSource(DEM)
    } else if (map.getLayer(HILLSHADE)) {
      map.setLayoutProperty(HILLSHADE, 'visibility', 'none')
    }
    gestures3d(map, false)
    camera(map, false)
    setRelief(failed ? 'failed' : 'idle')
  }

  function to3d() {
    const map = mapRef.current
    if (!map) return
    const dem = { type: 'raster-dem' as const, tiles: [TERRARIUM], encoding: 'terrarium' as const, tileSize: 256, maxzoom: 15, attribution: DEM_ATTRIBUTION }
    if (!map.getSource(DEM)) map.addSource(DEM, dem)
    // fonte própria para o sombreado (o MapLibre recomenda não partilhar a do terreno)
    if (!map.getSource(HILLSHADE_SRC)) map.addSource(HILLSHADE_SRC, dem)
    if (!map.getLayer(HILLSHADE)) {
      // por baixo do traçado e dos nomes
      const layers = map.getStyle().layers ?? []
      const before = layers.find((l) => routes.some((r) => l.id === `${r.id}-casing`))?.id ?? layers.find((l) => l.type === 'symbol')?.id
      map.addLayer(
        {
          id: HILLSHADE,
          type: 'hillshade',
          source: HILLSHADE_SRC,
          paint: {
            'hillshade-shadow-color': '#5b544d',
            'hillshade-highlight-color': '#ffffff',
            'hillshade-accent-color': '#7d756c',
            'hillshade-exaggeration': 0.4,
          },
        },
        before,
      )
    } else map.setLayoutProperty(HILLSHADE, 'visibility', 'visible')

    // o relevo chegou? basta uma tile; erro antes disso ou 12 s sem nada: volta ao 2D com aviso
    let got = false
    const onData = (e: MapSourceDataEvent) => {
      if (e.sourceId === DEM && e.tile && !got) {
        got = true
        setRelief('ok')
        cleanup()
      }
    }
    const onError = (e: { sourceId?: string }) => {
      if (!got && (e.sourceId === DEM || e.sourceId === HILLSHADE_SRC)) to2d(true)
    }
    const timer = window.setTimeout(() => !got && to2d(true), 12000)
    const cleanup = () => {
      window.clearTimeout(timer)
      map.off('sourcedata', onData)
      map.off('error', onError)
    }
    demWatch.current?.()
    demWatch.current = cleanup
    map.on('sourcedata', onData)
    map.on('error', onError)

    setRelief('loading')
    setView('3d')
    map.setTerrain({ source: DEM, exaggeration: EXAGGERATION })
    gestures3d(map, true)
    camera(map, true)
  }

  const ready = state === 'ready' || state === 'fallback'
  const factor = EXAGGERATION.toLocaleString('pt-PT')
  const reliefNote =
    relief === 'failed'
      ? 'Relevo 3D indisponível de momento'
      : view === '3d'
        ? relief === 'loading'
          ? 'A carregar o relevo…'
          : `Relevo exagerado ${factor}×`
        : null

  return (
    <div className="trailmap" style={{ height }} role="region" aria-label={label}>
      <div ref={el} className="trailmap-canvas" />
      {state === 'loading' && <p className="trailmap-note mono">A carregar o mapa…</p>}
      {state === 'error' && <p className="trailmap-note mono">Não foi possível mostrar o mapa.</p>}
      {state !== 'loading' && routes.length > 0 && missing.length === routes.length && (
        <p className="trailmap-note mono">Traçado oficial publicado em breve</p>
      )}
      {terrain3d && ready && (
        <div className="trailmap-view">
          <p className="trailmap-view-note" role="status" aria-live="polite">
            {reliefNote && <span>{reliefNote}</span>}
          </p>
          <div className="trailmap-seg" role="group" aria-label="Vista do mapa">
            <button type="button" aria-pressed={view === '2d'} onClick={() => view === '3d' && to2d()}>
              Ver em 2D
            </button>
            <button type="button" aria-pressed={view === '3d'} onClick={() => view === '2d' && to3d()}>
              Ver em 3D
            </button>
          </div>
        </div>
      )}
      {children}
    </div>
  )
}

// margem à volta do traçado: menos em ecrãs estreitos; em baixo, espaço para o botão 2D / 3D
function fitPadding(map: MLMap) {
  const w = map.getContainer().clientWidth
  const p = w < 480 ? 28 : 48
  return { top: p, right: p + 24, bottom: p + 40, left: p }
}
