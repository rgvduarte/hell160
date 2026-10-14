// Converte o GPX oficial de uma prova nos ficheiros que o site usa:
//   public/routes/<id>.gpx           cópia do GPX original, para os atletas descarregarem
//   public/routes/<id>.geojson       traçado simplificado (LineString [lon, lat, alt]) para o mapa
//   public/routes/<id>.profile.json  distância, D+, perfil [km, alt] a cada 100 m e pontos públicos do percurso
//
// Uso: node scripts/gpx-to-geojson.mjs <ficheiro.gpx> <id>
//   <id> é o nome do ficheiro em src/data/routes.ts (ROUTE_FILES): hell160, hell100 ou bike.
//   As estafetas usam o ficheiro hell100. Depois de converter, ativa a prova em ROUTE_PUBLISHED (src/data/site.ts).
//
// O GPX é tratado só como dados: lido com expressões regulares, nada é executado.
// Regras:
//   - usa os pontos do track (<trkpt>); só se não houver track usa os da rota (<rtept>)
//   - altitudes ≤ 0 m contam como em falta (falha do GPS no arranque; no Alentejo não há terreno abaixo do mar)
//   - D+ com altitude suavizada (janela de ~100 m) e limiar de 3 m, para não somar ruído
//   - waypoints públicos: PA (abastecimentos), BV (bases de vida), Água e Ponto de controlo.
//     O resto (Estrada, Pedras, WC, Duches, notas da organização) fica fora do site, mas continua no GPX descarregável.
//   - o km de cada ponto é a projeção na linha do percurso; se o percurso passa duas vezes perto do mesmo
//     ponto, fica a passagem que mantém os PA por ordem e o script avisa.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [, , file, id] = process.argv
if (!file || !id || !/^[a-z0-9-]+$/.test(id)) {
  console.error('uso: node scripts/gpx-to-geojson.mjs <ficheiro.gpx> <id>   (id: hell160, hell100 ou bike)')
  process.exit(1)
}
const KNOWN = ['hell160', 'hell100', 'bike']
if (!KNOWN.includes(id)) console.warn(`aviso: "${id}" não está em ROUTE_FILES (${KNOWN.join(', ')}); o site não o vai usar sem mudar src/data/routes.ts`)

const xml = readFileSync(file, 'utf8')
const num = (s) => (s == null || s === '' ? null : Number(s))
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`))?.[1]
const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&')
    .normalize('NFC')
    .trim()

// ---------- pontos do track ----------
function readPoints(tag) {
  const out = []
  for (const m of xml.matchAll(new RegExp(`<${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${tag}>)`, 'g'))) {
    const lat = num(attr(m[1], 'lat'))
    const lon = num(attr(m[1], 'lon'))
    const raw = num((m[2] ?? '').match(/<ele>([^<]+)<\/ele>/)?.[1])
    const ele = Number.isFinite(raw) && raw > 0 ? raw : null
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) out.push({ lat, lon, ele })
  }
  return out
}
let pts = readPoints('trkpt')
if (pts.length < 2) pts = readPoints('rtept')
if (pts.length < 2) {
  console.error('GPX sem pontos de track/rota')
  process.exit(1)
}
const zeroEle = [...xml.matchAll(/<ele>\s*(-?[\d.]+)\s*<\/ele>/g)].filter((m) => Number(m[1]) <= 0).length

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

// altitude suavizada (janela de ~100 m) e D+ com limiar de 3 m
const hasEle = pts.some((p) => p.ele != null)
let gain = 0
if (hasEle) {
  const smooth = pts.map((p, i) => {
    let s = 0
    let n = 0
    for (let j = i; j >= 0 && p.d - pts[j].d <= 50; j--) if (pts[j].ele != null) (s += pts[j].ele), n++
    for (let j = i + 1; j < pts.length && pts[j].d - p.d <= 50; j++) if (pts[j].ele != null) (s += pts[j].ele), n++
    return n ? s / n : null
  })
  // pontos sem altitude à volta (raro): usa o valor suavizado mais próximo
  for (let i = 0, last = smooth.find((v) => v != null); i < smooth.length; i++) smooth[i] == null ? (smooth[i] = last) : (last = smooth[i])
  let ref = smooth[0]
  for (const v of smooth) {
    if (v - ref >= 3) (gain += v - ref), (ref = v)
    else if (ref - v >= 3) ref = v
  }
  pts.forEach((p, i) => (p.es = smooth[i]))
}

// perfil a cada 100 m, mais o ponto final exato
const eleAt = (m) => {
  let lo = 0
  let hi = pts.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (pts[mid].d <= m) lo = mid
    else hi = mid
  }
  const a = pts[lo]
  const b = pts[hi]
  const f = b.d === a.d ? 0 : Math.max(0, Math.min(1, (m - a.d) / (b.d - a.d)))
  return hasEle ? Math.round(a.es + (b.es - a.es) * f) : null
}
const profile = []
const steps = Math.floor(acc / 100)
for (let k = 0; k <= steps; k++) profile.push([k / 10, eleAt(k * 100)])
if (acc - steps * 100 > 20) profile.push([Math.round(totalKm * 100) / 100, eleAt(acc)])

// ---------- waypoints públicos ----------
function publicWaypoint(name) {
  const bv = name.match(/\bBV\s*(\d+)\b/i)
  const pa = name.match(/^PA\s*(\d+)\b/i)
  if (bv) return { name: `Base de vida ${+bv[1]}`, kind: 'life', order: pa ? +pa[1] : null }
  if (pa && /^PA\s*\d+$/i.test(name)) return { name: `PA${+pa[1]}`, kind: 'aid', order: +pa[1] }
  if (/^[aá]gua\b/iu.test(name)) return { name: 'Água', kind: 'water', order: null }
  if (/^ponto de controlo\b/iu.test(name)) return { name: 'Ponto de controlo', kind: 'control', order: null }
  return null
}

// projeção local em metros (equiretangular à volta do centro do percurso)
const lat0 = rad(pts.reduce((s, p) => s + p.lat, 0) / pts.length)
const xy = (p) => [p.lon * 111320 * Math.cos(lat0), p.lat * 110540]
const P = pts.map(xy)

// todas as passagens do percurso a menos de 250 m do ponto (mínimos locais), da mais próxima para a mais afastada
function passes(w) {
  const [x, y] = xy(w)
  const found = []
  let cur = null
  for (let i = 0; i < P.length - 1; i++) {
    const [x1, y1] = P[i]
    const [x2, y2] = P[i + 1]
    const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
    const t = L2 ? Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / L2)) : 0
    const d = Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1)))
    const km = (pts[i].d + t * (pts[i + 1].d - pts[i].d)) / 1000
    if (d <= 250) {
      if (!cur || d < cur.d) cur = { d, km }
    } else if (cur) {
      found.push(cur)
      cur = null
    }
  }
  if (cur) found.push(cur)
  if (!found.length) {
    // longe do percurso: fica a projeção mais próxima, com aviso
    let best = { d: Infinity, km: 0 }
    for (let i = 0; i < P.length; i++) {
      const d = Math.hypot(x - P[i][0], y - P[i][1])
      if (d < best.d) best = { d, km: pts[i].d / 1000 }
    }
    found.push(best)
  }
  // a mesma passagem pode aparecer partida em dois mínimos muito próximos: junta os que distam menos de 500 m
  const merged = []
  for (const f of found.sort((a, b) => a.km - b.km)) {
    const last = merged[merged.length - 1]
    if (last && f.km - last.km < 0.5) {
      if (f.d < last.d) merged[merged.length - 1] = f
    } else merged.push(f)
  }
  return merged.sort((a, b) => a.d - b.d)
}

const hidden = []
const kept = []
for (const m of xml.matchAll(/<wpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/wpt>)/g)) {
  const lat = num(attr(m[1], 'lat'))
  const lon = num(attr(m[1], 'lon'))
  const raw = decode(m[2]?.match(/<name>([\s\S]*?)<\/name>/)?.[1] ?? '')
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
  const pub = publicWaypoint(raw)
  if (!pub) {
    hidden.push(raw || '(sem nome)')
    continue
  }
  kept.push({ ...pub, raw, lat, lon, passes: passes({ lat, lon }) })
}

// PA e BV numerados por ordem: escolhe, para cada um, a passagem que mantém a ordem (se houver mais do que uma)
const warnings = []
const numbered = kept.filter((w) => w.order != null).sort((a, b) => a.order - b.order)
let prevKm = -1
for (const w of numbered) {
  // depois do PA anterior, a passagem mais próxima; entre passagens quase tão próximas (±50 m), a primeira
  const ok = w.passes.filter((p) => p.d <= 250 && p.km > prevKm)
  const bestD = Math.min(...ok.map((p) => p.d))
  const pick = w.passes.length > 1 && ok.length ? ok.filter((p) => p.d <= bestD + 50).sort((a, b) => a.km - b.km)[0] : w.passes[0]
  if (pick !== w.passes[0]) warnings.push(`${w.raw}: o percurso passa ${w.passes.length} vezes por aqui; usado o km ${pick.km.toFixed(1)} para manter a ordem dos PA`)
  w.pick = pick
  if (pick.km < prevKm) warnings.push(`${w.raw}: km ${pick.km.toFixed(1)} fora de ordem (anterior ${prevKm.toFixed(1)})`)
  prevKm = pick.km
}
for (const w of kept) {
  w.pick ??= w.passes[0]
  if (w.order == null && w.passes.length > 1) warnings.push(`${w.raw}: o percurso passa ${w.passes.length} vezes perto (km ${w.passes.map((p) => p.km.toFixed(1)).join(', ')}); usado o mais próximo`)
  if (w.pick.d > 150) warnings.push(`${w.raw}: a ${Math.round(w.pick.d)} m do percurso`)
}

const waypoints = kept
  .map((w) => ({ name: w.name, kind: w.kind, km: Math.round(w.pick.km * 10) / 10, lat: +w.lat.toFixed(6), lon: +w.lon.toFixed(6), offTrackM: Math.round(w.pick.d) }))
  .sort((a, b) => a.km - b.km)

// ---------- traçado simplificado (Douglas-Peucker, ~6 m) ----------
function simplify(points, tol) {
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()
    let max = 0
    let idx = -1
    const [x1, y1] = P[s]
    const [x2, y2] = P[e]
    const L = Math.hypot(x2 - x1, y2 - y1)
    for (let i = s + 1; i < e; i++) {
      const [x, y] = P[i]
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
// altitude em cada vértice (a do GPS; se faltar, a suavizada): útil para quem descarregar o GeoJSON.
// O mapa 3D assenta a linha no relevo e não precisa dela.
const line = simplify(pts, 6).map((p) => {
  const c = [+p.lon.toFixed(5), +p.lat.toFixed(5)]
  if (hasEle) c.push(Math.round(p.ele ?? p.es))
  return c
})

// ---------- escrita ----------
const outDir = new URL('../public/routes/', import.meta.url)
mkdirSync(outDir, { recursive: true })
const gainM = hasEle ? Math.round(gain) : null
writeFileSync(
  new URL(`${id}.geojson`, outDir),
  JSON.stringify({ type: 'Feature', properties: { id, distanceKm: +totalKm.toFixed(2), gainM }, geometry: { type: 'LineString', coordinates: line } }),
)
writeFileSync(
  new URL(`${id}.profile.json`, outDir),
  JSON.stringify({ id, distanceKm: +totalKm.toFixed(2), gainM, start: [pts[0].lon, pts[0].lat], profile, waypoints }),
)
const gpxOut = fileURLToPath(new URL(`${id}.gpx`, outDir))
if (resolve(file) !== gpxOut) copyFileSync(file, gpxOut)

const eles = profile.map((p) => p[1]).filter((v) => v != null)
console.log(
  `${id}: ${totalKm.toFixed(2)} km, D+ ${gainM != null ? gainM + ' m' : 'sem altitude'}` +
    (eles.length ? ` (alt. ${Math.min(...eles)}–${Math.max(...eles)} m)` : '') +
    `, ${pts.length} pontos → ${line.length} no mapa` +
    (zeroEle ? `, ${zeroEle} altitudes ≤ 0 m ignoradas` : ''),
)
console.log(`  pontos públicos (${waypoints.length}): ${waypoints.map((w) => `${w.name} ${w.km}`).join(' · ')}`)
if (hidden.length) console.log(`  fora do site (${hidden.length}): ${hidden.join(', ')}`)
for (const w of warnings) console.warn(`  aviso: ${w}`)
console.log(`  escrito: public/routes/${id}.geojson, ${id}.profile.json, ${id}.gpx`)
