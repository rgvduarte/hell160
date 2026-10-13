// Converte o GPX oficial de uma prova em dados para o site:
//   public/routes/<id>.geojson       traçado simplificado (LineString) para o mapa
//   public/routes/<id>.profile.json  distância, D+, perfil [km, alt] a cada 100 m e waypoints do GPX
// Uso: node scripts/gpx-to-geojson.mjs <ficheiro.gpx> <id>   (ex.: hell160, hell100, bike)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const [, , file, id] = process.argv
if (!file || !id) {
  console.error('uso: node scripts/gpx-to-geojson.mjs <ficheiro.gpx> <id>')
  process.exit(1)
}

const xml = readFileSync(file, 'utf8')
const num = (s) => (s == null ? null : Number(s))
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]+)"`))?.[1]

// pontos do track (ou da rota, se o GPX só tiver <rte>)
const pts = []
for (const m of xml.matchAll(/<(trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/\1>|<(trkpt|rtept)\b([^>]*)\/>/g)) {
  const head = m[2] ?? m[5]
  const body = m[3] ?? ''
  const lat = num(attr(head, 'lat'))
  const lon = num(attr(head, 'lon'))
  const ele = num(body.match(/<ele>([^<]+)<\/ele>/)?.[1])
  if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push({ lat, lon, ele })
}
if (pts.length < 2) {
  console.error('GPX sem pontos de track/rota')
  process.exit(1)
}

const wpts = [...xml.matchAll(/<wpt\b([^>]*)>([\s\S]*?)<\/wpt>/g)].map((m) => ({
  lat: num(attr(m[1], 'lat')),
  lon: num(attr(m[1], 'lon')),
  name: (m[2].match(/<name>([\s\S]*?)<\/name>/)?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
}))

const R = 6371008.8
const rad = (d) => (d * Math.PI) / 180
function dist(a, b) {
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// distância acumulada
let acc = 0
pts[0].d = 0
for (let i = 1; i < pts.length; i++) {
  acc += dist(pts[i - 1], pts[i])
  pts[i].d = acc
}
const totalKm = acc / 1000

// altitude suavizada (janela de ~100 m) e D+ com limiar de 3 m para não somar ruído do GPS
const hasEle = pts.some((p) => Number.isFinite(p.ele))
let gain = 0
if (hasEle) {
  const smooth = pts.map((p, i) => {
    let s = 0
    let n = 0
    for (let j = i; j >= 0 && p.d - pts[j].d <= 50; j--) if (Number.isFinite(pts[j].ele)) (s += pts[j].ele), n++
    for (let j = i + 1; j < pts.length && pts[j].d - p.d <= 50; j++) if (Number.isFinite(pts[j].ele)) (s += pts[j].ele), n++
    return n ? s / n : null
  })
  let ref = smooth.find((v) => v != null)
  for (const v of smooth) {
    if (v == null) continue
    if (v - ref >= 3) (gain += v - ref), (ref = v)
    else if (ref - v >= 3) ref = v
  }
  pts.forEach((p, i) => (p.es = smooth[i]))
}

// perfil a cada 100 m
const profile = []
for (let km = 0, i = 0; km <= totalKm + 1e-9; km += 0.1) {
  while (i < pts.length - 2 && pts[i + 1].d / 1000 < km) i++
  const a = pts[i]
  const b = pts[i + 1]
  const f = b.d === a.d ? 0 : (km * 1000 - a.d) / (b.d - a.d)
  const ele = hasEle && a.es != null && b.es != null ? a.es + (b.es - a.es) * Math.max(0, Math.min(1, f)) : null
  profile.push([Math.round(km * 10) / 10, ele == null ? null : Math.round(ele)])
}

// waypoints do GPX colocados no km do ponto do track mais próximo
const waypoints = wpts
  .filter((w) => Number.isFinite(w.lat) && Number.isFinite(w.lon))
  .map((w) => {
    let best = pts[0]
    let bd = Infinity
    for (const p of pts) {
      const d = dist(p, w)
      if (d < bd) (bd = d), (best = p)
    }
    return { name: w.name, lat: w.lat, lon: w.lon, km: Math.round(best.d / 100) / 10, offTrackM: Math.round(bd) }
  })
  .sort((a, b) => a.km - b.km)

// Douglas-Peucker (~6 m) para o traçado do mapa
function simplify(points, tol) {
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  const xy = points.map((p) => [p.lon * 111320 * Math.cos(rad(p.lat)), p.lat * 110540])
  while (stack.length) {
    const [s, e] = stack.pop()
    let max = 0
    let idx = -1
    const [x1, y1] = xy[s]
    const [x2, y2] = xy[e]
    const L = Math.hypot(x2 - x1, y2 - y1)
    for (let i = s + 1; i < e; i++) {
      const [x, y] = xy[i]
      // percurso circular: início e fim coincidem, mede-se a distância ao ponto
      const d = L < 1e-6 ? Math.hypot(x - x1, y - y1) : Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / L
      if (d > max) (max = d), (idx = i)
    }
    if (max > tol && idx > 0) {
      keep[idx] = 1
      stack.push([s, idx], [idx, e])
    }
  }
  return points.filter((_, i) => keep[i])
}
const line = simplify(pts, 6).map((p) => [+p.lon.toFixed(5), +p.lat.toFixed(5)])

const outDir = new URL('../public/routes/', import.meta.url)
mkdirSync(outDir, { recursive: true })
writeFileSync(
  new URL(`${id}.geojson`, outDir),
  JSON.stringify({ type: 'Feature', properties: { id, distanceKm: +totalKm.toFixed(2), gainM: Math.round(gain) }, geometry: { type: 'LineString', coordinates: line } }),
)
writeFileSync(
  new URL(`${id}.profile.json`, outDir),
  JSON.stringify({ id, distanceKm: +totalKm.toFixed(2), gainM: hasEle ? Math.round(gain) : null, start: [pts[0].lon, pts[0].lat], profile, waypoints }),
)
console.log(`${id}: ${totalKm.toFixed(2)} km, D+ ${hasEle ? Math.round(gain) + ' m' : 'sem altitude'}, ${pts.length} pontos → ${line.length} no mapa, ${waypoints.length} waypoints`)
