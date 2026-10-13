// Gera public/geo/iberia.geojson (Portugal + Espanha, Natural Earth 1:10m via world-atlas) para o fundo
// de reserva do mapa quando as tiles não carregam. Uso: node scripts/build-geo.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { feature } from 'topojson-client'

const require = createRequire(import.meta.url)
const topo = JSON.parse(readFileSync(require.resolve('world-atlas/countries-10m.json'), 'utf8'))
const all = feature(topo, topo.objects.countries)
const keep = { 620: 'Portugal', 724: 'Espanha' }
const round = (c) => (typeof c[0] === 'number' ? [+c[0].toFixed(3), +c[1].toFixed(3)] : c.map(round))
const inIberia = (ring) => ring.some(([x, y]) => x > -10 && x < 4.5 && y > 35.8 && y < 44)
const features = all.features
  .filter((f) => keep[+f.id])
  .map((f) => {
    const g = f.geometry
    const polys = (g.type === 'Polygon' ? [g.coordinates] : g.coordinates).filter((p) => inIberia(p[0]))
    return { type: 'Feature', properties: { name: keep[+f.id] }, geometry: { type: 'MultiPolygon', coordinates: round(polys) } }
  })
mkdirSync(new URL('../public/geo/', import.meta.url), { recursive: true })
const out = JSON.stringify({ type: 'FeatureCollection', features })
writeFileSync(new URL('../public/geo/iberia.geojson', import.meta.url), out)
console.log('iberia.geojson', (out.length / 1024).toFixed(0), 'KB')
