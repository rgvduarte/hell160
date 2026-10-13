// Regras de negócio partilhadas pelas páginas: vagas, dorsais, pagamentos, alojamento, exportações.

import { EVENT, RACES, raceById, type Race } from '../data/event'
import { LISTINGS, type Listing } from '../data/listings'
import { getAll, update, type Booking, type HostApplication, type PayMethod, type Registration } from './store'

// ---------- provas ----------

export const activeRegs = (regs: Registration[], race?: string) =>
  regs.filter((r) => r.status !== 'cancelada' && (!race || r.race === race))

export function spotsLeft(race: Race, regs: Registration[]) {
  if (race.places == null) return Infinity
  return Math.max(0, race.places - activeRegs(regs, race.id).length)
}

// Dorsais por prova: 160 → 1–399, 100 → 401–699, duplas 701+, quartetos 801+, bike 901+
const BIB_BASE: Record<string, number> = { hell160: 1, hell100: 401, relay2: 701, relay4: 801, bike: 901 }

export function nextBib(raceId: string, regs: Registration[]) {
  const used = regs.filter((r) => r.race === raceId && r.bib != null).map((r) => r.bib!)
  return used.length ? Math.max(...used) + 1 : (BIB_BASE[raceId] ?? 1)
}

// ---------- pagamentos (simulação) ----------

export const MB_ENTITY = '12160' // entidade fictícia — substituir pela do PSP (Eupago, ifthenpay…)

export function multibancoReference(regId: string) {
  let h = 0
  for (const c of regId) h = (h * 31 + c.charCodeAt(0)) % 1_000_000_000
  return String(h).padStart(9, '0').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
}

export function requestPayment(reg: Registration, method: PayMethod, extra: { phone?: string; last4?: string } = {}) {
  update('registrations', reg.id, {
    payment: {
      method,
      requestedAt: new Date().toISOString(),
      ...(method === 'multibanco' ? { entity: MB_ENTITY, reference: multibancoReference(reg.id) } : {}),
      ...extra,
    },
  })
}

export function markPaid(regId: string) {
  const { registrations } = getAll()
  const reg = registrations.find((r) => r.id === regId)
  // só uma inscrição pendente pode passar a paga (nunca uma cancelada)
  if (!reg || reg.status !== 'pendente') return
  update('registrations', regId, {
    status: 'paga',
    bib: reg.bib ?? nextBib(reg.race, registrations),
    payment: { ...(reg.payment ?? { method: 'multibanco', requestedAt: new Date().toISOString() }), paidAt: new Date().toISOString() },
  })
}

export function luhn(num: string) {
  const d = num.replace(/\D/g, '')
  if (d.length < 13) return false
  let sum = 0
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i]
    if (i % 2) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
  }
  return sum % 10 === 0
}

// ---------- alojamento ----------

export function hostToListing(h: HostApplication): Listing {
  const tones: Listing['tone'][] = ['cal', 'ocre', 'terra', 'noite']
  return {
    id: h.id.toLowerCase(),
    title: h.title || `Casa de ${h.name.split(' ')[0]}`,
    village: h.village,
    host: h.name.split(' ')[0],
    hostSince: 2027,
    sleeps: h.sleeps,
    bedrooms: h.bedrooms,
    eurNight: h.eurNight,
    kmToStart: VILLAGE_KM[h.village] ?? 10,
    features: h.features,
    note: h.note || 'Casa nova na plataforma.',
    tone: tones[h.id.charCodeAt(h.id.length - 1) % tones.length],
  }
}

export const VILLAGE_KM: Record<string, number> = {
  'A-do-Pinto': 0.5,
  Serpa: 14,
  Brinches: 9,
  Pias: 12,
  'Vale de Vargo': 8,
  'Vila Nova de São Bento': 10,
  'Vila Verde de Ficalho': 22,
}

export function allListings(hosts: HostApplication[]): Listing[] {
  return [...LISTINGS, ...hosts.filter((h) => h.status === 'aprovado').map(hostToListing)]
}

export const findListing = (id: string, hosts: HostApplication[]) => allListings(hosts).find((l) => l.id === id)

export function takenNights(listingId: string, bookings: Booking[]) {
  return new Set(bookings.filter((b) => b.listingId === listingId && b.status === 'confirmado').flatMap((b) => b.nights))
}

export function pendingNights(listingId: string, bookings: Booking[]) {
  return new Set(bookings.filter((b) => b.listingId === listingId && b.status === 'pedido').flatMap((b) => b.nights))
}

// ---------- ficheiros ----------

export function download(name: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function toCSV<T extends object>(rows: T[], columns?: (keyof T)[]) {
  if (!rows.length) return ''
  const cols = columns ?? (Object.keys(rows[0]) as (keyof T)[])
  const cell = (v: unknown) => {
    const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // separador ";" e BOM para abrir bem no Excel em PT
  return '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => cell(r[c])).join(';'))].join('\n')
}

// Evento de calendário da partida, em UTC (julho em Lisboa = UTC+1). A bike ainda não tem data: devolve null.
export function raceICS(raceId: string): string | null {
  const race = raceById(raceId) ?? RACES[0]
  if (race.id === 'bike') return null
  // hora local de Lisboa → UTC: 22:00 → 21:00Z (HELL160), 08:00 → 07:00Z (HELL100 e estafetas)
  const startUtc = race.id === 'hell160' ? Date.UTC(2027, 6, 2, 21, 0) : Date.UTC(2027, 6, 3, 7, 0)
  const endUtc = startUtc + race.limitH * 3600_000
  const ics = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  // pt-PT não agrupa números de 4 dígitos por omissão; aqui queremos '2 648'
  const n = (v: number) => v.toLocaleString('pt-PT', { useGrouping: 'always' } as unknown as Intl.NumberFormatOptions)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HELL160//2027//PT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${race.id}-2027@hell160`,
    `DTSTAMP:${ics(Date.now())}`,
    `DTSTART:${ics(startUtc)}`,
    `DTEND:${ics(endUtc)}`,
    `SUMMARY:${race.name} · partida`,
    `LOCATION:${EVENT.base}\\, A-do-Pinto\\, Serpa`,
    `DESCRIPTION:${n(race.distanceKm)} km · ${n(race.gainM)} m D+ · limite ${race.limitH} h. Datas 2027 a confirmar.`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export const eur = (n: number) => `${n.toLocaleString('pt-PT')} €`

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
