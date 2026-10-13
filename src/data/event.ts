// Dados de base da edição 2027.
// Os valores marcados `tbc` vêm do regulamento 2026 e ainda não foram confirmados para 2027.

export const EVENT = {
  name: 'HELL160',
  tagline: 'Shadows and Dust',
  edition: 2027,
  base: 'Pavilhão Polivalente de A-do-Pinto',
  place: 'A-do-Pinto · Serpa · Beja',
  region: 'Margem esquerda do Guadiana',
  email: 'hell160.organizacao@gmail.com',
  instagram: 'https://www.instagram.com/hell.160/',
  // Partida HELL160: sexta-feira, 22:00 (hora de Lisboa, UTC+1 em julho)
  startISO: '2027-07-02T22:00:00+01:00',
  tbc: true,
} as const

export type RaceId = 'hell160' | 'hell100' | 'relay2' | 'relay4' | 'bike'

export type Race = {
  id: RaceId
  name: string
  short: string
  kind: 'Trail' | 'Estafeta' | 'BTT / Gravel'
  distanceKm: number
  gainM: number
  limitH: number
  start: string
  startNote: string
  places: number | null
  prices: { until: string; label: string; eur: number }[]
  blurb: string
  aid: number
  lifeBases: number
}

export const RACES: Race[] = [
  {
    id: 'hell160',
    name: 'HELL160',
    short: '160',
    kind: 'Trail',
    distanceKm: 164.6,
    gainM: 2648,
    limitH: 36,
    start: 'Sex 2 jul 2027 · 22:00',
    startNote: 'Partida noturna. Duas noites possíveis no percurso.',
    places: 350,
    prices: [
      { until: '2026-12-31', label: 'até 31 dez 2026', eur: 110 },
      { until: '2027-05-31', label: '1 jan – 31 mai 2027', eur: 130 },
      { until: '2027-06-15', label: '1 – 15 jun 2027', eur: 150 },
    ],
    blurb:
      'Circular pela GR15 e GR15.2, estradões, montado e as aldeias da margem esquerda. Autonomia total, navegação por GPS, calor de julho.',
    aid: 13,
    lifeBases: 3,
  },
  {
    id: 'hell100',
    name: 'HELL100',
    short: '100',
    kind: 'Trail',
    distanceKm: 104,
    gainM: 1460,
    limitH: 24,
    start: 'Sáb 3 jul 2027 · 08:00',
    startNote: 'Hora a confirmar.',
    places: 200,
    prices: [
      { until: '2026-12-31', label: 'até 31 dez 2026', eur: 80 },
      { until: '2027-05-31', label: '1 jan – 31 mai 2027', eur: 95 },
      { until: '2027-06-15', label: '1 – 15 jun 2027', eur: 110 },
    ],
    blurb: 'Metade sul do percurso, com a passagem junto ao Guadiana. A porta de entrada para o 160.',
    aid: 8,
    lifeBases: 2,
  },
  {
    id: 'relay2',
    name: 'HELL100 Duplas',
    short: '2×',
    kind: 'Estafeta',
    distanceKm: 104,
    gainM: 1460,
    limitH: 24,
    start: 'Sáb 3 jul 2027 · 08:00',
    startNote: 'Troca na base de vida intermédia.',
    places: 40,
    prices: [
      { until: '2026-12-31', label: 'até 31 dez 2026', eur: 150 },
      { until: '2027-05-31', label: '1 jan – 31 mai 2027', eur: 170 },
      { until: '2027-06-15', label: '1 – 15 jun 2027', eur: 190 },
    ],
    blurb: 'Dois atletas, dois setores. Preço por equipa.',
    aid: 8,
    lifeBases: 2,
  },
  {
    id: 'relay4',
    name: 'HELL100 Quartetos',
    short: '4×',
    kind: 'Estafeta',
    distanceKm: 104,
    gainM: 1460,
    limitH: 24,
    start: 'Sáb 3 jul 2027 · 08:00',
    startNote: 'Três trocas, nas bases de vida.',
    places: 30,
    prices: [
      { until: '2026-12-31', label: 'até 31 dez 2026', eur: 260 },
      { until: '2027-05-31', label: '1 jan – 31 mai 2027', eur: 300 },
      { until: '2027-06-15', label: '1 – 15 jun 2027', eur: 340 },
    ],
    blurb: 'Quatro atletas, quatro setores. Preço por equipa.',
    aid: 8,
    lifeBases: 2,
  },
  {
    id: 'bike',
    name: 'HELL100 Bike',
    short: 'B',
    kind: 'BTT / Gravel',
    distanceKm: 100,
    gainM: 1400,
    limitH: 12,
    start: 'Fevereiro 2027 · data a anunciar',
    startNote: 'Passa para o inverno: sem calor extremo. Estudo de traçado transfronteiriço com Espanha.',
    places: 100,
    prices: [
      { until: '2026-12-31', label: 'até 31 dez 2026', eur: 60 },
      { until: '2027-01-31', label: 'jan 2027', eur: 70 },
    ],
    blurb: 'Gravel e BTT pelos mesmos caminhos, em fevereiro. Primeira prova a abrir a porta a Espanha.',
    aid: 5,
    lifeBases: 1,
  },
]

export const raceById = (id: string) => RACES.find((r) => r.id === id)

export function currentPrice(race: Race, today = new Date()) {
  const t = today.toISOString().slice(0, 10)
  return race.prices.find((p) => t <= p.until) ?? null
}

export const MANDATORY_GEAR = [
  'Mochila ou cinto de hidratação, mínimo 1,5 L',
  'Copo reutilizável',
  'Frontal + pilhas ou bateria de reserva',
  'Manta térmica',
  'Apito',
  'Telemóvel carregado, com a app HELL160 ativa',
  'Relógio ou dispositivo GPS com o track carregado',
  'Dorsal visível',
]

export const RECOMMENDED_GEAR = [
  'Boné ou buff',
  'Protetor solar',
  'Bastões (nunca nos sacos das bases de vida)',
  'Reserva alimentar',
  'Dinheiro ou MB WAY',
  'Óculos de sol',
  'Powerbank',
]

// Números da reunião de 13 out 2026
export const IMPACT = {
  visitors2023: '3 000 – 4 000',
  economicImpact: '> 500 000 €',
  houses: '≈ 10 000',
  closedHouses: '≈ 5 000',
  nightly: '50 – 80 €',
}
