// Persistência local do protótipo. Substituir por API (inscrições, reservas, anfitriões)
// quando houver backend. Todas as leituras toleram armazenamento indisponível.

import { useCallback, useEffect, useState } from 'react'

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
}

export type Booking = {
  id: string
  createdAt: string
  listingId: string
  nights: string[]
  guests: number
  name: string
  email: string
  totalEur: number
  status: 'pedido' | 'confirmado'
}

export type HostApplication = {
  id: string
  createdAt: string
  name: string
  phone: string
  village: string
  address: string
  sleeps: number
  bedrooms: number
  eurNight: number
  features: string[]
  state: string
}

type Collections = {
  registrations: Registration[]
  bookings: Booking[]
  hosts: HostApplication[]
}

const KEY = 'hell160.v1'

function read(): Collections {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { registrations: [], bookings: [], hosts: [], ...JSON.parse(raw) }
  } catch {
    /* modo privado ou armazenamento bloqueado */
  }
  return { registrations: [], bookings: [], hosts: [] }
}

function write(data: Collections) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* ignorar: o protótipo continua a funcionar em memória */
  }
  window.dispatchEvent(new Event(KEY))
}

let memory = read()

export function add<K extends keyof Collections>(key: K, item: Collections[K][number]) {
  memory = { ...memory, [key]: [...memory[key], item] }
  write(memory)
}

export function useCollection<K extends keyof Collections>(key: K): Collections[K] {
  const [items, setItems] = useState(memory[key])
  const sync = useCallback(() => setItems(memory[key]), [key])
  useEffect(() => {
    window.addEventListener(KEY, sync)
    return () => window.removeEventListener(KEY, sync)
  }, [sync])
  return items
}

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
