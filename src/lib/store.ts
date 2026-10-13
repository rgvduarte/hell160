// Camada de dados do protótipo. Sem backend: tudo fica no browser (localStorage).
// A API (add / update / remove / useCollection / selectores) é a fronteira a trocar por um backend
// (ex.: Supabase/Postgres + pagamentos Eupago/ifthenpay) sem mexer nas páginas.

import { useCallback, useEffect, useState } from 'react'

export type PayMethod = 'mbway' | 'multibanco' | 'cartao'

export type Payment = {
  method: PayMethod
  entity?: string
  reference?: string
  phone?: string
  last4?: string
  requestedAt: string
  paidAt?: string
}

export type MedicalCert = {
  fileName: string
  size: number
  uploadedAt: string
  status: 'em validação' | 'validado' | 'recusado'
}

export type Registration = {
  id: string
  createdAt: string
  race: string
  first: string
  last: string
  email: string
  phone: string
  birth: string
  nationality: string
  emergencyName: string
  emergencyPhone: string
  device: 'phone' | 'phone+watch' | 'rental'
  shirt: string
  priceEur: number
  stayId?: string
  status: 'pendente' | 'paga' | 'cancelada'
  payment?: Payment
  bib?: number
  medical?: MedicalCert
  gearChecked?: string[]
}

export type Booking = {
  id: string
  createdAt: string
  listingId: string
  nights: string[]
  guests: number
  name: string
  email: string
  phone?: string
  totalEur: number
  status: 'pedido' | 'confirmado' | 'recusado' | 'cancelado'
  decidedAt?: string
}

export type HostApplication = {
  id: string
  createdAt: string
  name: string
  phone: string
  email?: string
  village: string
  address: string
  title?: string
  note?: string
  sleeps: number
  bedrooms: number
  eurNight: number
  features: string[]
  state: string
  status: 'pendente' | 'aprovado' | 'recusado'
  decidedAt?: string
}

export type Pledge = {
  id: string
  createdAt: string
  name: string
  email: string
  amountEur: number
  place: string
  kind: 'empresa' | 'particular'
}

export type Lead = {
  id: string
  createdAt: string
  kind: 'parceiro' | 'formacao'
  name: string
  email: string
  org?: string
  phone?: string
  village?: string
  interest?: string
}

export type Collections = {
  registrations: Registration[]
  bookings: Booking[]
  hosts: HostApplication[]
  pledges: Pledge[]
  leads: Lead[]
}

type Key = keyof Collections
type Item<K extends Key> = Collections[K][number]

const KEY = 'hell160.v2'
const EMPTY: Collections = { registrations: [], bookings: [], hosts: [], pledges: [], leads: [] }

function read(): Collections {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...EMPTY, ...JSON.parse(raw) }
  } catch {
    /* modo privado ou armazenamento bloqueado */
  }
  return { ...EMPTY }
}

let memory = read()

function commit(next: Collections) {
  memory = next
  try {
    localStorage.setItem(KEY, JSON.stringify(memory))
  } catch {
    /* sem armazenamento: o protótipo continua em memória */
  }
  window.dispatchEvent(new Event(KEY))
}

// sincroniza entre separadores
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      memory = read()
      window.dispatchEvent(new Event(KEY))
    }
  })
}

export function getAll(): Collections {
  return memory
}

export function add<K extends Key>(key: K, item: Item<K>) {
  commit({ ...memory, [key]: [...memory[key], item] })
  return item
}

export function update<K extends Key>(key: K, id: string, patch: Partial<Item<K>>) {
  commit({
    ...memory,
    [key]: (memory[key] as Item<K>[]).map((x) => (x.id === id ? { ...x, ...patch } : x)),
  })
}

export function remove<K extends Key>(key: K, id: string) {
  commit({ ...memory, [key]: (memory[key] as Item<K>[]).filter((x) => x.id !== id) })
}

export function replaceAll(data: Partial<Collections>) {
  commit({ ...EMPTY, ...data })
}

export function resetAll() {
  commit({ ...EMPTY })
}

export function useCollection<K extends Key>(key: K): Collections[K] {
  const [items, setItems] = useState(memory[key])
  const sync = useCallback(() => setItems(memory[key]), [key])
  useEffect(() => {
    sync()
    window.addEventListener(KEY, sync)
    return () => window.removeEventListener(KEY, sync)
  }, [sync])
  return items
}

export function useStore(): Collections {
  const [all, setAll] = useState(memory)
  useEffect(() => {
    const sync = () => setAll(memory)
    sync()
    window.addEventListener(KEY, sync)
    return () => window.removeEventListener(KEY, sync)
  }, [])
  return all
}

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase()

// ---------- sessão do atleta (área pessoal) ----------

const SESSION = 'hell160.session'

export function getSessionEmail(): string | null {
  try {
    return localStorage.getItem(SESSION)
  } catch {
    return null
  }
}

export function setSessionEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(SESSION, email.trim().toLowerCase())
    else localStorage.removeItem(SESSION)
  } catch {
    /* ignorar */
  }
  window.dispatchEvent(new Event(SESSION))
}

export function useSessionEmail() {
  const [email, setEmail] = useState(getSessionEmail)
  useEffect(() => {
    const sync = () => setEmail(getSessionEmail())
    window.addEventListener(SESSION, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(SESSION, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return email
}

export const sameEmail = (a?: string, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase()
