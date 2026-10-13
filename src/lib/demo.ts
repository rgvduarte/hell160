// Dados de demonstração para o back-office da organização.
// Determinísticos: a mesma semente produz sempre os mesmos registos, para que capturas e testes batam certo.
// Nomes fictícios, emails @exemplo.pt e telefones inventados. Nenhum destes registos corresponde a pessoas reais.

import { RACES, currentPrice, type RaceId } from '../data/event'
import { EVENT_NIGHTS, LISTINGS } from '../data/listings'
import { MB_ENTITY, multibancoReference, nextBib } from './domain'
import {
  replaceAll,
  type Booking,
  type Collections,
  type HostApplication,
  type Lead,
  type MedicalCert,
  type PayMethod,
  type Payment,
  type Pledge,
  type Registration,
} from './store'

const SEED = 1602027
// Momento de referência da demonstração: todas as datas ficam antes disto.
const ANCHOR = Date.parse('2026-10-12T19:30:00Z')
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const RENTAL_EUR = 15

const FIRST_PT_M = ['João', 'Pedro', 'Miguel', 'Tiago', 'Rui', 'Nuno', 'Ricardo', 'Bruno', 'André', 'Hugo', 'Luís', 'Paulo', 'Filipe', 'Diogo', 'Sérgio', 'Vítor', 'Marco', 'Gonçalo']
const FIRST_PT_F = ['Ana', 'Marta', 'Joana', 'Inês', 'Sofia', 'Catarina', 'Rita', 'Sara', 'Mariana', 'Teresa', 'Patrícia', 'Cláudia', 'Raquel', 'Filipa']
const LAST_PT = ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Fernandes', 'Gonçalves', 'Lopes', 'Marques', 'Alves', 'Ribeiro', 'Carvalho', 'Teixeira', 'Moreira', 'Mendes', 'Nunes', 'Caeiro', 'Mestre', 'Guerreiro', 'Palma', 'Charrua', 'Valente', 'Rosado', 'Bexiga']
const FIRST_ES_M = ['Javier', 'Alejandro', 'Pablo', 'Sergio', 'Daniel', 'Álvaro', 'Iván', 'Raúl', 'Manuel']
const FIRST_ES_F = ['Lucía', 'Elena', 'Laura', 'Carmen', 'Nuria', 'Cristina', 'Pilar']
const LAST_ES = ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Romero', 'Navarro', 'Domínguez', 'Vázquez', 'Ramos']
const SHIRTS = ['XS', 'S', 'M', 'M', 'M', 'L', 'L', 'L', 'XL', 'XXL']

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

const iso = (ms: number) => new Date(ms).toISOString()
const pad = (n: number) => String(n).padStart(2, '0')

/** Constrói o conjunto completo de dados de demonstração, sem o gravar. */
export function demoData(): Collections {
  const rand = mulberry32(SEED)
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
  const chance = (p: number) => rand() < p
  function pick<T>(xs: readonly T[]): T {
    return xs[Math.floor(rand() * xs.length)]
  }
  function shuffle<T>(xs: T[]): T[] {
    const out = [...xs]
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      ;[out[i], out[j]] = [out[j], out[i]]
    }
    return out
  }
  const ALPHA = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const ref = (prefix: string) => `${prefix}-${Array.from({ length: 8 }, () => ALPHA[Math.floor(rand() * 36)]).join('')}`
  const digits = (n: number) => Array.from({ length: n }, () => int(0, 9)).join('')
  const phonePT = () => `9${pick(['1', '2', '3', '6'])}${digits(1)} ${digits(3)} ${digits(3)}`
  const phoneES = () => `+34 6${digits(2)} ${digits(3)} ${digits(3)}`

  const usedEmails = new Set<string>()
  function email(first: string, last: string) {
    const base = `${fold(first)}.${fold(last)}`
    let candidate = `${base}@exemplo.pt`
    for (let n = 2; usedEmails.has(candidate); n++) candidate = `${base}${n}@exemplo.pt`
    usedEmails.add(candidate)
    return candidate
  }

  // ---------- inscrições ----------

  const plan: [RaceId, number][] = [
    ['hell160', 26],
    ['hell100', 18],
    ['relay2', 6],
    ['relay4', 4],
    ['bike', 6],
  ]
  const slots = shuffle(plan.flatMap(([id, n]) => Array<RaceId>(n).fill(id)))
  const span = 44 * DAY
  const nearStart = LISTINGS.filter((l) => l.kmToStart < 13)

  const registrations: Registration[] = slots.map((raceId, i) => {
    const race = RACES.find((r) => r.id === raceId)!
    const es = chance(0.2)
    const female = chance(0.32)
    const first = es ? pick(female ? FIRST_ES_F : FIRST_ES_M) : pick(female ? FIRST_PT_F : FIRST_PT_M)
    const last = es ? `${pick(LAST_ES)} ${pick(LAST_ES)}` : pick(LAST_PT)
    const id = ref('H27')
    const created = ANCHOR - span + Math.round((i / slots.length) * span) + int(-4, 4) * HOUR + int(0, 59) * MIN
    const device: Registration['device'] = pick(['phone+watch', 'phone+watch', 'phone+watch', 'phone', 'phone', 'rental'] as const)
    const price = currentPrice(race, new Date(created))?.eur ?? race.prices[0].eur
    const phone = es ? phoneES() : phonePT()

    const roll = rand()
    const status: Registration['status'] = roll < 0.56 ? 'paga' : roll < 0.64 ? 'cancelada' : 'pendente'

    let payment: Payment | undefined
    const requested = created + int(2, 25) * MIN
    if (status === 'paga') {
      const method: PayMethod = es ? (chance(0.8) ? 'cartao' : 'multibanco') : pick(['mbway', 'mbway', 'mbway', 'multibanco', 'multibanco', 'cartao'] as const)
      // o Multibanco demora horas a entrar; nunca depois do momento de referência
      const wait = method === 'multibanco' ? Math.min(int(2, 40) * HOUR, (ANCHOR - requested) * 0.8) : int(1, 4) * MIN
      payment = paymentFor(id, method, requested, phone, () => digits(4))
      payment.paidAt = iso(requested + wait)
    } else if (status === 'pendente') {
      const p = rand()
      if (p < 0.45) payment = paymentFor(id, 'multibanco', requested, phone, () => digits(4))
      else if (p < 0.6 && !es) payment = paymentFor(id, 'mbway', requested, phone, () => digits(4))
    } else if (chance(0.5)) {
      payment = paymentFor(id, 'multibanco', requested, phone, () => digits(4))
    }

    let medical: MedicalCert | undefined
    const m = rand()
    const medStatus: MedicalCert['status'] | null =
      status === 'paga'
        ? m < 0.5 ? 'validado' : m < 0.7 ? 'em validação' : m < 0.75 ? 'recusado' : null
        : status === 'pendente'
          ? m < 0.22 ? 'em validação' : null
          : null
    if (medStatus) {
      const uploaded = Math.min(created + int(1, 96) * HOUR, ANCHOR - int(20, 300) * MIN)
      medical = {
        fileName: es
          ? pick(['certificado_medico.pdf', `certificado-${fold(last.split(' ')[0])}.pdf`, `IMG_${int(1000, 9999)}.jpg`])
          : pick([`atestado-${fold(last)}.pdf`, `Atestado_medico_${fold(first)}.pdf`, `IMG_${int(1000, 9999)}.jpg`, 'scan_atestado.pdf']),
        size: int(140, 2600) * 1000,
        uploadedAt: iso(uploaded),
        status: medStatus,
      }
    }

    return {
      id,
      createdAt: iso(created),
      race: raceId,
      first,
      last,
      email: email(first, last),
      phone,
      birth: `${int(1964, 2001)}-${pad(int(1, 12))}-${pad(int(1, 28))}`,
      nationality: es ? 'Espanha' : chance(0.06) ? pick(['França', 'Reino Unido', 'Brasil']) : 'Portugal',
      emergencyName: `${pick(es ? [...FIRST_ES_F, ...FIRST_ES_M] : [...FIRST_PT_F, ...FIRST_PT_M])} ${last.split(' ')[0]}`,
      emergencyPhone: es ? phoneES() : phonePT(),
      device,
      shirt: pick(SHIRTS),
      priceEur: price + (device === 'rental' ? RENTAL_EUR : 0),
      stayId: chance(0.15) ? pick(nearStart).id : undefined,
      status,
      payment,
      medical,
    }
  })

  // Dorsais pela ordem de pagamento, com a mesma regra da plataforma (nextBib)
  registrations
    .filter((r) => r.status === 'paga')
    .sort((a, b) => (a.payment?.paidAt ?? '').localeCompare(b.payment?.paidAt ?? ''))
    .forEach((r) => {
      r.bib = nextBib(r.race, registrations)
    })

  // ---------- reservas ----------

  const N = EVENT_NIGHTS.map((n) => n.iso)
  const athletes = registrations.filter((r) => r.status === 'paga')
  type Who = { name: string; email: string; phone: string }
  const athlete = (k: number): Who => {
    const r = athletes[(k * 7) % athletes.length]
    return { name: `${r.first} ${r.last}`, email: r.email, phone: r.phone }
  }
  const supporter = (first: string, last: string): Who => ({ name: `${first} ${last}`, email: email(first, last), phone: phonePT() })

  const bookingPlan: { listing: string; nights: number[]; guests: number; status: Booking['status']; who: Who; daysAgo: number }[] = [
    { listing: 'adp-01', nights: [1, 2], guests: 2, status: 'confirmado', who: athlete(0), daysAgo: 31 },
    { listing: 'adp-01', nights: [2], guests: 2, status: 'pedido', who: supporter('Helena', 'Rosado'), daysAgo: 30 },
    { listing: 'adp-02', nights: [0, 1, 2], guests: 5, status: 'confirmado', who: athlete(1), daysAgo: 26 },
    { listing: 'brn-02', nights: [1, 2, 3], guests: 8, status: 'confirmado', who: athlete(2), daysAgo: 22 },
    { listing: 'pia-02', nights: [0, 1], guests: 4, status: 'recusado', who: supporter('Carlos', 'Bexiga'), daysAgo: 19 },
    { listing: 'vnsb-01', nights: [2, 3], guests: 2, status: 'cancelado', who: athlete(3), daysAgo: 15 },
    { listing: 'srp-01', nights: [1, 2], guests: 4, status: 'pedido', who: athlete(4), daysAgo: 6 },
    { listing: 'srp-01', nights: [2, 3], guests: 3, status: 'pedido', who: supporter('Lucía', 'Navarro'), daysAgo: 4 },
    { listing: 'vvg-01', nights: [1, 2], guests: 3, status: 'pedido', who: athlete(5), daysAgo: 3 },
    { listing: 'adp-03', nights: [1], guests: 1, status: 'pedido', who: supporter('Marta', 'Valente'), daysAgo: 1 },
  ]

  const bookings: Booking[] = bookingPlan.map((b) => {
    const listing = LISTINGS.find((l) => l.id === b.listing)!
    const created = ANCHOR - b.daysAgo * DAY + int(-6, 6) * HOUR
    const decided = b.status === 'pedido' ? undefined : Math.min(created + int(30, 60) * HOUR, ANCHOR - HOUR)
    const nights = b.nights.map((k) => N[k])
    return {
      id: ref('R27'),
      createdAt: iso(created),
      listingId: listing.id,
      nights,
      guests: Math.min(b.guests, listing.sleeps),
      name: b.who.name,
      email: b.who.email,
      phone: b.who.phone,
      totalEur: nights.length * listing.eurNight,
      status: b.status,
      ...(decided ? { decidedAt: iso(decided) } : {}),
    }
  })

  // ---------- candidaturas de anfitriões ----------

  const hostPlan: Omit<HostApplication, 'id' | 'createdAt' | 'status' | 'phone' | 'email'>[] = [
    {
      name: 'Gertrudes Caeiro',
      village: 'Vale de Vargo',
      address: 'Rua da Igreja, 14',
      title: 'Casa da Igreja',
      note: 'Casa dos meus pais, fechada desde 2019. Três camas de casal e um pátio grande.',
      sleeps: 6,
      bedrooms: 3,
      eurNight: 60,
      features: ['patio', 'wash', 'family'],
      state: 'pequenas',
    },
    {
      name: 'Domingos Palma',
      village: 'Pias',
      address: 'Largo da Feira, 3',
      title: 'Casa do Largo da Feira',
      note: 'Levo os atletas à partida na sexta à noite. Garagem fechada para bicicletas.',
      sleeps: 4,
      bedrooms: 2,
      eurNight: 70,
      features: ['ac', 'bike', 'late', 'shuttle'],
      state: 'pronta',
    },
    {
      name: 'Isabel Mestre',
      village: 'Vila Nova de São Bento',
      address: 'Rua de Serpa, 41',
      note: 'Quarto com casa de banho própria, no rés-do-chão.',
      sleeps: 2,
      bedrooms: 1,
      eurNight: 50,
      features: ['ac', 'breakfast'],
      state: 'pronta',
    },
    {
      name: 'Manuel Guerreiro',
      village: 'A-do-Pinto',
      address: 'Travessa do Forno, 7',
      title: 'Casa do Forno',
      note: 'Esteve fechada muitos anos. Preciso de ajuda com o registo de alojamento local.',
      sleeps: 5,
      bedrooms: 2,
      eurNight: 80,
      features: ['ac', 'patio', 'bike', 'wash', 'late'],
      state: 'fechada',
    },
  ]

  const hosts: HostApplication[] = hostPlan.map((h, k) => ({
    ...h,
    id: ref('A27'),
    createdAt: iso(ANCHOR - (12 - k * 3) * DAY + int(-5, 5) * HOUR),
    phone: phonePT(),
    email: k === 2 ? undefined : email(h.name.split(' ')[0], h.name.split(' ').slice(-1)[0]),
    status: 'pendente',
  }))

  // ---------- compromissos para desfibrilhadores ----------

  const pledgePlan: Omit<Pledge, 'id' | 'createdAt' | 'email'>[] = [
    { name: 'Adega Monte do Pó, Lda.', amountEur: 1800, place: 'Vale de Vargo', kind: 'empresa' },
    { name: 'Oficina Guerreiro & Filhos', amountEur: 1800, place: 'Brinches', kind: 'empresa' },
    { name: 'Olival da Margem, Lda.', amountEur: 600, place: 'Pias', kind: 'empresa' },
    { name: 'Teresa Charrua', amountEur: 250, place: 'A-do-Pinto · partida e meta', kind: 'particular' },
    { name: 'Javier Romero Ramos', amountEur: 150, place: 'Vila Verde de Ficalho', kind: 'particular' },
    { name: 'Paulo Bexiga', amountEur: 100, place: 'Onde fizer mais falta', kind: 'particular' },
  ]
  const pledges: Pledge[] = pledgePlan.map((p, k) => ({
    ...p,
    id: ref('D27'),
    createdAt: iso(ANCHOR - (28 - k * 4) * DAY + int(-5, 5) * HOUR),
    email: p.kind === 'empresa' ? `geral.${fold(p.name.split(',')[0]).slice(0, 18)}@exemplo.pt` : email(p.name.split(' ')[0], p.name.split(' ').slice(-1)[0]),
  }))

  // ---------- contactos ----------

  const leadPlan: Omit<Lead, 'id' | 'createdAt'>[] = [
    { kind: 'parceiro', name: 'Rita Valadares', org: 'Valadares Turismo Rural', email: email('Rita', 'Valadares'), phone: phonePT(), interest: 'Alojamento / hotelaria' },
    { kind: 'parceiro', name: 'Tomás Rebelo', org: 'Rebelo & Associados, investimentos', email: email('Tomás', 'Rebelo'), interest: 'Plataforma / tecnologia' },
    { kind: 'parceiro', name: 'Elena Domínguez', org: 'Senderos de la Raya, asociación', email: email('Elena', 'Domínguez'), phone: phoneES(), interest: 'Patrocínio de segurança' },
    { kind: 'formacao', name: 'Joaquina Pinto', email: email('Joaquina', 'Pinto'), phone: phonePT(), village: 'Brinches', interest: 'Suporte básico de vida e DAE, grupo de 8 pessoas' },
    { kind: 'formacao', name: 'Vítor Charrua', org: 'Clube de caçadores', email: email('Vítor', 'Charrua'), phone: phonePT(), village: 'Pias', interest: 'Formação para quem fica no abastecimento' },
  ]
  const leads: Lead[] = leadPlan.map((l, k) => ({
    ...l,
    id: ref('L27'),
    createdAt: iso(ANCHOR - (20 - k * 4) * DAY + int(-5, 5) * HOUR),
  }))

  return { registrations, bookings, hosts, pledges, leads }
}

function paymentFor(regId: string, method: PayMethod, requestedMs: number, phone: string, last4: () => string): Payment {
  const p: Payment = { method, requestedAt: iso(requestedMs) }
  if (method === 'multibanco') {
    p.entity = MB_ENTITY
    p.reference = multibancoReference(regId)
  } else if (method === 'mbway') {
    p.phone = phone
  } else {
    p.last4 = last4()
  }
  return p
}

/** Substitui tudo o que está guardado pelos dados de demonstração e devolve-os. */
export function seedDemo(): Collections {
  const data = demoData()
  replaceAll(data)
  return data
}
