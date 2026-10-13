// Percurso esquemático do HELL160 para visualização.
// Não é o GPX oficial: substituir por `route.gpx` quando o traçado 2027 estiver fechado.

export const ROUTE_KM = 164.6

export type Waypoint = {
  km: number
  name: string
  kind: 'start' | 'aid' | 'life' | 'village'
}

export const WAYPOINTS: Waypoint[] = [
  { km: 0, name: 'A-do-Pinto', kind: 'start' },
  { km: 11.8, name: 'Vale de Vargo', kind: 'aid' },
  { km: 23.5, name: 'Abastecimento 2', kind: 'aid' },
  { km: 36.2, name: 'Vila Verde de Ficalho', kind: 'life' },
  { km: 48.9, name: 'Abastecimento 4', kind: 'aid' },
  { km: 60.4, name: 'Pias', kind: 'aid' },
  { km: 72.0, name: 'Vila Nova de São Bento', kind: 'aid' },
  { km: 83.7, name: 'Serpa', kind: 'life' },
  { km: 95.1, name: 'Pulo do Lobo', kind: 'aid' },
  { km: 106.3, name: 'Margem do Guadiana', kind: 'aid' },
  { km: 118.8, name: 'Brinches', kind: 'aid' },
  { km: 130.2, name: 'Santa Iria', kind: 'life' },
  { km: 141.6, name: 'Vale dos Mortos', kind: 'aid' },
  { km: 153.0, name: 'Abastecimento 13', kind: 'aid' },
  { km: 164.6, name: 'A-do-Pinto', kind: 'start' },
]

// Pontos de controlo do traçado num viewBox 1000 × 700.
// Guadiana corre a oeste (lado esquerdo do mapa).
const CTRL: [number, number][] = [
  [560, 360], [640, 420], [720, 470], [800, 420], [870, 340], [830, 250],
  [740, 200], [650, 150], [560, 120], [470, 170], [400, 250], [330, 330],
  [250, 420], [210, 520], [260, 600], [360, 610], [450, 560], [500, 470], [560, 360],
]

function catmull(p0: number[], p1: number[], p2: number[], p3: number[], t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return [0, 1].map(
    (i) =>
      0.5 *
      (2 * p1[i] +
        (-p0[i] + p2[i]) * t +
        (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 +
        (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3),
  ) as [number, number]
}

function buildPolyline(samplesPerSeg = 24) {
  const pts: [number, number][] = []
  const n = CTRL.length - 1
  for (let i = 0; i < n; i++) {
    const p0 = CTRL[(i - 1 + n) % n]
    const p1 = CTRL[i]
    const p2 = CTRL[i + 1]
    const p3 = CTRL[(i + 2) % n]
    for (let s = 0; s < samplesPerSeg; s++) {
      const [x, y] = catmull(p0, p1, p2, p3, s / samplesPerSeg)
      // pequeno ruído determinístico para parecer caminho e não curva de desenho
      const j = Math.sin(i * 12.9898 + s * 78.233) * 4
      pts.push([x + j, y - j * 0.6])
    }
  }
  pts.push(pts[0])
  return pts
}

export const POLYLINE = buildPolyline()

const cumulative = (() => {
  const acc = [0]
  for (let i = 1; i < POLYLINE.length; i++) {
    const [ax, ay] = POLYLINE[i - 1]
    const [bx, by] = POLYLINE[i]
    acc.push(acc[i - 1] + Math.hypot(bx - ax, by - ay))
  }
  return acc
})()

const totalLen = cumulative[cumulative.length - 1]

export function pointAtKm(km: number): [number, number] {
  const target = (Math.min(Math.max(km, 0), ROUTE_KM) / ROUTE_KM) * totalLen
  let lo = 0
  let hi = cumulative.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (cumulative[mid] < target) lo = mid
    else hi = mid
  }
  const seg = cumulative[hi] - cumulative[lo] || 1
  const f = (target - cumulative[lo]) / seg
  const [ax, ay] = POLYLINE[lo]
  const [bx, by] = POLYLINE[hi]
  return [ax + (bx - ax) * f, ay + (by - ay) * f]
}

export const ROUTE_PATH = POLYLINE.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')

// Altimetria sintética: planície ondulada entre ~110 m e ~330 m, com a subida a meio
// a meio e a descida ao Guadiana depois de Serpa.
export function elevationAt(km: number) {
  const base = 190
  const ficalho = 120 * Math.exp(-((km - 47) ** 2) / 90)
  const guadiana = -70 * Math.exp(-((km - 104) ** 2) / 120)
  const rolling = 24 * Math.sin(km / 4.3) + 12 * Math.sin(km / 1.9 + 1.7) + 4 * Math.sin(km / 0.9)
  return Math.round(base + ficalho + guadiana + rolling)
}

export const PROFILE = Array.from({ length: 331 }, (_, i) => {
  const km = (i / 330) * ROUTE_KM
  return { km, ele: elevationAt(km) }
})

// Guadiana, a oeste do traçado
export const RIVER_PATH =
  'M120,0 C150,80 90,140 130,210 S200,300 150,380 S90,470 140,540 S190,640 150,700'
