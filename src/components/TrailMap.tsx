import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Map as MLMap, StyleSpecification, LayerSpecification, LngLatBoundsLike, IControl, MapSourceDataEvent, CameraOptions } from 'maplibre-gl'
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
  'NavigationControl.ResetBearing': 'Arrasta para rodar; clica para repor o norte',
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

// Cores do logótipo (ver os tokens em global.css): terra em --panel, água em areia esbatida, estradas e limites em
// tons de --areia e --po, nomes em --ink-3, traçado em --fire com contorno branco. Sem cinzentos neutros.
const TONES = {
  land: '#f2eee7', // --panel
  park: '#ebe5da',
  wood: '#e6dfd2',
  residential: '#eae3d9', // --panel-2
  building: '#e7e0d5',
  buildingLine: '#dcd2c3',
  water: '#d9cdb9', // areia esbatida
  waterway: '#cdbfa8',
  roadCasing: '#d6c9b3', // areia clara
  roadInner: '#fbf9f5',
  roadMinor: '#e2d8c8',
  roadPath: '#e8e0d3',
  roadSubtle: 'rgba(202, 186, 159, 0.55)', // --areia
  rail: '#d6c9b3',
  railDash: '#f7f3ec',
  boundary: 'rgba(122, 106, 88, 0.7)', // --po
  label: '#6f604f', // --ink-3 (5,2:1 sobre a terra)
  halo: 'rgba(242, 238, 231, 0.9)',
  ember: '#f17307', // --ember, o laranja do 160
}

// Reconta as cores do Positron para os tons do logótipo, camada a camada.
function tint(l: LayerSpecification): LayerSpecification {
  const id = l.id
  const paint = (p: Record<string, unknown>) => ({ ...l, paint: { ...l.paint, ...p } }) as LayerSpecification
  if (l.type === 'background') return paint({ 'background-color': TONES.land })
  if (l.type === 'fill') {
    if (/water/.test(id)) return paint({ 'fill-color': TONES.water })
    if (/park/.test(id)) return paint({ 'fill-color': TONES.park })
    if (/wood/.test(id)) return paint({ 'fill-color': TONES.wood })
    if (/residential/.test(id)) return paint({ 'fill-color': TONES.residential })
    if (/building/.test(id)) return paint({ 'fill-color': TONES.building, 'fill-outline-color': TONES.buildingLine })
    return paint({ 'fill-color': TONES.park })
  }
  if (l.type === 'line') {
    if (/waterway/.test(id)) return paint({ 'line-color': TONES.waterway })
    if (/boundary/.test(id)) return paint({ 'line-color': TONES.boundary })
    if (/dashline/.test(id)) return paint({ 'line-color': TONES.railDash })
    if (/railway/.test(id)) return paint({ 'line-color': TONES.rail })
    if (/casing/.test(id)) return paint({ 'line-color': TONES.roadCasing })
    if (/subtle/.test(id)) return paint({ 'line-color': TONES.roadSubtle })
    if (/inner/.test(id)) {
      const c = l.paint?.['line-color']
      // autoestradas: discretas a zoom baixo, cheias a partir do 6, como no Positron
      return paint({ 'line-color': Array.isArray(c) ? ['interpolate', ['linear'], ['zoom'], 5.8, TONES.roadSubtle, 6, TONES.roadInner] : TONES.roadInner })
    }
    if (/path/.test(id)) return paint({ 'line-color': TONES.roadPath })
    if (/minor/.test(id)) return paint({ 'line-color': TONES.roadMinor })
    return paint({ 'line-color': TONES.roadCasing })
  }
  if (l.type === 'symbol' && l.layout && 'text-field' in l.layout) {
    return {
      ...l,
      layout: { ...l.layout, 'text-field': ['coalesce', ['get', 'name:pt'], ['get', 'name']] },
      paint: { ...l.paint, 'text-color': TONES.label, 'text-halo-color': TONES.halo },
    } as LayerSpecification
  }
  return l
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
    // a atribuição (em português) vai no controlo do mapa; a do TileJSON repetia-a em inglês.
    // O que está no estilo sobrepõe-se ao TileJSON, e uma atribuição vazia não aparece.
    for (const src of Object.values(style.sources)) if (src.type === 'vector' || src.type === 'raster') src.attribution = ''
    style.layers = style.layers.filter((l) => !/poi|housenumber|aerodrome|airport/.test(l.id)).map(tint)
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
          { id: 'border', type: 'line', source: 'iberia', paint: { 'line-color': TONES.boundary, 'line-width': 1.2, 'line-dasharray': [3, 2] } },
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
  const sampleRef = useRef<[number, number][]>([])
  const compassRef = useRef<IControl | null>(null)
  const demWatch = useRef<(() => void) | null>(null)
  const demLoaded = useRef(false)
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
      libRef.current = maplibregl
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
        const all: [number, number][] = []
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
            for (const line of lines) for (const c of line) bounds.extend([c[0], c[1]]), all.push([c[0], c[1]])
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
        for (const m of markers) bounds.extend(m.lngLat), all.push(m.lngLat)
        // amostra do traçado para enquadrar a vista 3D (que não é um retângulo no ecrã)
        const every = Math.max(1, Math.ceil(all.length / 300))
        sampleRef.current = all.filter((_, i) => i % every === 0)
        if (!bounds.isEmpty()) {
          boundsRef.current = bounds.toArray() as LngLatBoundsLike
          map.fitBounds(boundsRef.current, { padding: fitPadding(map, terrain3d), duration: 0, maxZoom: fallback ? 9 : 12 })
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
      demLoaded.current = false
      map?.remove()
      mapRef.current = null
      compassRef.current = null
      boundsRef.current = null
      sampleRef.current = []
      setView('2d')
      setRelief('idle')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, JSON.stringify(routes), JSON.stringify(markers), waypoints, terrain3d])

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
      const compass = new lib.NavigationControl({ showZoom: false, showCompass: true, visualizePitch: true })
      compassRef.current = compass
      map.addControl(compass, 'top-right')
    } else if (!on && compassRef.current) {
      map.removeControl(compassRef.current)
      compassRef.current = null
    }
  }

  function camera(map: MLMap, to3d: boolean) {
    const bounds = boundsRef.current
    const pad = padWithToggle(map)
    let opts: CameraOptions = { pitch: to3d ? PITCH_3D : 0, bearing: 0 }
    const base = bounds ? map.cameraForBounds(bounds, { padding: pad, maxZoom: 12 }) : undefined
    if (base) opts = { ...opts, center: base.center, zoom: base.zoom }
    if (to3d && base && sampleRef.current.length) opts = fitPitched(map, opts, pad, sampleRef.current)
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
      demLoaded.current = false
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
            // sombra em --sombra, luz branca, ambas com pouca opacidade
            'hillshade-shadow-color': 'rgba(75, 60, 49, 0.6)',
            'hillshade-highlight-color': 'rgba(255, 255, 255, 0.5)',
            'hillshade-accent-color': 'rgba(75, 60, 49, 0.3)',
            'hillshade-exaggeration': 0.5,
          },
        },
        before,
      )
    } else map.setLayoutProperty(HILLSHADE, 'visibility', 'visible')

    // o relevo chegou? basta uma tile; erro antes disso ou 12 s sem nada: volta ao 2D com aviso
    let got = demLoaded.current
    const onData = (e: MapSourceDataEvent) => {
      if (e.sourceId === DEM && e.tile && !got) {
        got = demLoaded.current = true
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
    if (got) cleanup()
    else {
      map.on('sourcedata', onData)
      map.on('error', onError)
    }

    setRelief(got ? 'ok' : 'loading')
    setView('3d')
    map.setTerrain({ source: DEM, exaggeration: EXAGGERATION })
    gestures3d(map, true)
    camera(map, true)
  }

  const ready = state === 'ready' || state === 'fallback'
  const noRoute = routes.length > 0 && missing.length === routes.length
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
      {state !== 'loading' && noRoute && (
        <p className="trailmap-note mono">Traçado oficial publicado em breve</p>
      )}
      {terrain3d && ready && !noRoute && (
        <div className="trailmap-view">
          <div className="trailmap-seg" role="group" aria-label="Vista do mapa">
            <button type="button" className={`btn small${view === '2d' ? '' : ' ghost'}`} aria-pressed={view === '2d'} onClick={() => view === '3d' && to2d()}>
              Ver em 2D
            </button>
            <button type="button" className={`btn small${view === '3d' ? '' : ' ghost'}`} aria-pressed={view === '3d'} onClick={() => view === '2d' && to3d()}>
              Ver em 3D
            </button>
          </div>
          <p className="trailmap-view-note" role="status" aria-live="polite">
            {reliefNote && <span>{reliefNote}</span>}
          </p>
        </div>
      )}
      {children}
    </div>
  )
}

// margem à volta do traçado: menos em ecrãs estreitos; com o botão 2D / 3D, mais espaço em cima
type Pad = { top: number; right: number; bottom: number; left: number }
function padWithToggle(map: MLMap): Pad {
  const p = map.getContainer().clientWidth < 480 ? 24 : 44
  return { top: p + 52, right: p, bottom: p, left: p }
}
const fitPadding = (map: MLMap, toggle: boolean): Pad | number =>
  toggle ? padWithToggle(map) : map.getContainer().clientWidth < 480 ? 24 : 44

// Vista inclinada: o fitBounds do MapLibre não conta com a perspetiva (o perto aumenta, o longe encolhe).
// Mede onde o traçado cai no ecrã e corrige centro e zoom algumas vezes; tudo na mesma tarefa, sem desenhar.
function fitPitched(map: MLMap, cam: CameraOptions, pad: Pad, pts: [number, number][]): CameraOptions {
  const before = { center: map.getCenter(), zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }
  const { clientWidth: W, clientHeight: H } = map.getContainer()
  const tw = Math.max(40, W - pad.left - pad.right)
  const th = Math.max(40, H - pad.top - pad.bottom)
  let c = { ...cam }
  for (let i = 0; i < 6; i++) {
    map.jumpTo(c)
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const p of pts) {
      const s = map.project(p)
      x0 = Math.min(x0, s.x)
      x1 = Math.max(x1, s.x)
      y0 = Math.min(y0, s.y)
      y1 = Math.max(y1, s.y)
    }
    const k = Math.min(tw / Math.max(1, x1 - x0), th / Math.max(1, y1 - y0))
    const center = map.unproject([W / 2 + (x0 + x1) / 2 - (pad.left + tw / 2), H / 2 + (y0 + y1) / 2 - (pad.top + th / 2)])
    c = { ...c, center, zoom: Math.min(12, map.getZoom() + Math.log2(k)) }
    if (Math.abs(Math.log2(k)) < 0.02) break
  }
  map.jumpTo(before)
  return c
}
